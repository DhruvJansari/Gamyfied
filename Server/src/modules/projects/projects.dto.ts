import type { Project } from "./projects.repository";

export type ProjectDto = {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  repoUrl: string | null;
  liveUrl: string | null;
  projectType: Project["projectType"];
  verificationStatus: Project["verificationStatus"];
  createdAt: string;
  updatedAt: string;
};

export function toProjectDto(row: Project): ProjectDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    technologies: row.technologies,
    repoUrl: row.repoUrl,
    liveUrl: row.liveUrl,
    projectType: row.projectType,
    verificationStatus: row.verificationStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
