import { AppError, ErrorCode } from "../../lib/errors";
import { PARTICIPATIONS_MAX } from "../scoring/scoring.config";
import { scoringService } from "../scoring/scoring.service";
import { toParticipationDto, type ParticipationDto } from "./participations.dto";
import { participationsRepository, type Participation } from "./participations.repository";
import type { CreateParticipationInput, UpdateParticipationInput } from "./participations.schemas";

async function owned(userId: string, id: string): Promise<Participation> {
  const row = await participationsRepository.findByIdForUser(id, userId);
  if (!row) throw AppError.notFound("Entry not found");
  return row;
}

export const participationsService = {
  async create(userId: string, input: CreateParticipationInput): Promise<ParticipationDto> {
    if ((await participationsRepository.countByUserId(userId)) >= PARTICIPATIONS_MAX) {
      throw AppError.badRequest(ErrorCode.PARTICIPATION_LIMIT_REACHED, `You can add up to ${PARTICIPATIONS_MAX} entries`);
    }
    const row = await participationsRepository.create(userId, input);
    await scoringService.recomputeProfileScore(userId);
    return toParticipationDto(row);
  },

  async update(userId: string, id: string, input: UpdateParticipationInput): Promise<ParticipationDto> {
    const current = await owned(userId, id);
    const evidenceChanged = input.url !== undefined && input.url !== current.url;
    const row = await participationsRepository.update(id, {
      ...input,
      ...(evidenceChanged && current.verificationStatus !== "NOT_VERIFIED" ? { verificationStatus: "NOT_VERIFIED" as const } : {}),
    });
    await scoringService.recomputeProfileScore(userId);
    return toParticipationDto(row);
  },

  async remove(userId: string, id: string): Promise<void> {
    await owned(userId, id);
    await participationsRepository.deleteById(id);
    await scoringService.recomputeProfileScore(userId);
  },
};
