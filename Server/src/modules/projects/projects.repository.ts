import { prisma } from "../../config/db";
import type { Project } from "../../generated/prisma/client";
import type { ProjectType, VerificationStatus } from "../../generated/prisma/enums";

export type { Project };

export type ProjectFields = {
  name: string;
  description: string;
  technologies: string[];
  repoUrl: string | null;
  liveUrl: string | null;
  projectType: ProjectType;
};

export const projectsRepository = {
  listByUserId(userId: string): Promise<Project[]> {
    return prisma.project.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  },

  findByIdForUser(id: string, userId: string): Promise<Project | null> {
    return prisma.project.findFirst({ where: { id, userId } });
  },

  countByUserId(userId: string): Promise<number> {
    return prisma.project.count({ where: { userId } });
  },

  create(userId: string, fields: ProjectFields): Promise<Project> {
    return prisma.project.create({ data: { userId, ...fields } });
  },

  update(id: string, fields: Partial<ProjectFields> & { verificationStatus?: VerificationStatus }): Promise<Project> {
    return prisma.project.update({ where: { id }, data: fields });
  },

  setVerificationStatus(id: string, verificationStatus: VerificationStatus): Promise<Project> {
    return prisma.project.update({ where: { id }, data: { verificationStatus } });
  },

  deleteById(id: string): Promise<void> {
    return prisma.project.delete({ where: { id } }).then(() => undefined);
  },
};
