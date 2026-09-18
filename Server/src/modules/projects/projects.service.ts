import { AppError, ErrorCode } from "../../lib/errors";
import { isRepoUrl } from "../../shared/social-platforms";
import { PROJECTS_MAX } from "../scoring/scoring.config";
import { scoringService } from "../scoring/scoring.service";
import { toProjectDto, type ProjectDto } from "./projects.dto";
import { projectsRepository, type Project } from "./projects.repository";
import type { CreateProjectInput, UpdateProjectInput } from "./projects.schemas";

function assertRepoHost(repoUrl: string | null | undefined): void {
  if (repoUrl && !isRepoUrl(repoUrl)) {
    throw AppError.badRequest(ErrorCode.PROJECT_REPO_HOST_UNSUPPORTED, "Repository must be on a known code host", {
      repoUrl: "Use a GitHub, GitLab, Bitbucket or Codeberg repository URL",
    });
  }
}

async function ownedProject(userId: string, id: string): Promise<Project> {
  const row = await projectsRepository.findByIdForUser(id, userId);
  if (!row) throw AppError.notFound("Project not found");
  return row;
}

export const projectsService = {
  async create(userId: string, input: CreateProjectInput): Promise<ProjectDto> {
    assertRepoHost(input.repoUrl);
    if ((await projectsRepository.countByUserId(userId)) >= PROJECTS_MAX) {
      throw AppError.badRequest(ErrorCode.PROJECT_LIMIT_REACHED, `You can add up to ${PROJECTS_MAX} projects`);
    }
    const row = await projectsRepository.create(userId, input);
    await scoringService.recomputeProfileScore(userId);
    return toProjectDto(row);
  },

  async update(userId: string, id: string, input: UpdateProjectInput): Promise<ProjectDto> {
    const current = await ownedProject(userId, id);
    assertRepoHost(input.repoUrl);

    // The links are the evidence. Change them and any earlier verification no longer applies.
    const evidenceChanged =
      (input.repoUrl !== undefined && input.repoUrl !== current.repoUrl) ||
      (input.liveUrl !== undefined && input.liveUrl !== current.liveUrl);

    const row = await projectsRepository.update(id, {
      ...input,
      ...(evidenceChanged && current.verificationStatus !== "NOT_VERIFIED" ? { verificationStatus: "NOT_VERIFIED" as const } : {}),
    });
    await scoringService.recomputeProfileScore(userId);
    return toProjectDto(row);
  },

  async remove(userId: string, id: string): Promise<void> {
    await ownedProject(userId, id);
    await projectsRepository.deleteById(id);
    await scoringService.recomputeProfileScore(userId);
  },
};
