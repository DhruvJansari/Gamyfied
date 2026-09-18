import type { VerificationStatus, VerificationSubject } from "../../generated/prisma/enums";
import { AppError, ErrorCode } from "../../lib/errors";
import { participationsRepository } from "../participations/participations.repository";
import { projectsRepository } from "../projects/projects.repository";
import { VERIFICATION_COOLDOWN_SEC } from "../scoring/scoring.config";
import { scoringService } from "../scoring/scoring.service";
import { mockVerificationProvider } from "./mock.provider";
import type { VerificationOutcome, VerificationProvider } from "./provider";
import { verificationRepository } from "./verification.repository";

export type VerificationRequestDto = {
  verificationId: string;
  status: VerificationStatus;
};

// Swapping in the agent later is this one line (or an env-driven choice).
const provider: VerificationProvider = mockVerificationProvider;

/** Writes the denormalised status onto whichever row the verification is about. */
async function setSubjectStatus(subjectType: VerificationSubject, subjectId: string, status: VerificationStatus): Promise<void> {
  if (subjectType === "PROJECT") await projectsRepository.setVerificationStatus(subjectId, status);
  else if (subjectType === "PARTICIPATION") await participationsRepository.setVerificationStatus(subjectId, status);
  // SOCIAL_LINK has no denormalised status yet; trust level covers it until the agent exists.
}

async function request(userId: string, subjectType: VerificationSubject, subjectId: string, evidenceUrls: string[]): Promise<VerificationRequestDto> {
  const [pending, latest] = await Promise.all([
    verificationRepository.findPendingBySubject(subjectType, subjectId),
    verificationRepository.findLatestBySubject(subjectType, subjectId),
  ]);
  if (pending) {
    throw AppError.conflict(ErrorCode.VERIFICATION_ALREADY_PENDING, "This is already queued for verification");
  }
  if (latest) {
    const elapsedSec = (Date.now() - latest.requestedAt.getTime()) / 1000;
    if (elapsedSec < VERIFICATION_COOLDOWN_SEC) {
      throw AppError.rateLimited(Math.ceil(VERIFICATION_COOLDOWN_SEC - elapsedSec), ErrorCode.VERIFICATION_COOLDOWN, "You can ask for another check tomorrow");
    }
  }

  const row = await verificationRepository.create({ userId, subjectType, subjectId, source: provider.source });
  await setSubjectStatus(subjectType, subjectId, "VERIFICATION_PENDING");

  const outcome = await provider.request({ verificationId: row.id, userId, subjectType, subjectId, evidenceUrls });
  if (outcome) {
    await verificationService.complete(row.id, outcome);
    return { verificationId: row.id, status: outcome.status };
  }
  // Still pending. The status change alone shifts hints in the breakdown, so recompute.
  await scoringService.recomputeProfileScore(userId);
  return { verificationId: row.id, status: "VERIFICATION_PENDING" };
}

export const verificationService = {
  async requestForProject(userId: string, projectId: string): Promise<VerificationRequestDto> {
    const project = await projectsRepository.findByIdForUser(projectId, userId);
    if (!project) throw AppError.notFound("Project not found");
    return request(userId, "PROJECT", project.id, [project.repoUrl, project.liveUrl].filter((u): u is string => !!u));
  },

  async requestForParticipation(userId: string, participationId: string): Promise<VerificationRequestDto> {
    const entry = await participationsRepository.findByIdForUser(participationId, userId);
    if (!entry) throw AppError.notFound("Entry not found");
    return request(userId, "PARTICIPATION", entry.id, entry.url ? [entry.url] : []);
  },

  /**
   * Records an outcome and re-scores. Called inline by a synchronous provider today; the agent
   * worker calls the same method when it finishes. Safe to run twice: it overwrites the same row.
   */
  async complete(verificationId: string, outcome: VerificationOutcome): Promise<void> {
    const row = await verificationRepository.complete(verificationId, {
      status: outcome.status,
      points: outcome.points,
      signals: outcome.signals,
      result: outcome.result,
      errorCode: outcome.errorCode ?? null,
    });
    await setSubjectStatus(row.subjectType, row.subjectId, outcome.status);
    await scoringService.recomputeProfileScore(row.userId);
  },
};
