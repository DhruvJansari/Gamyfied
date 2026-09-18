import { request } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

// Mirrors Server/src/modules/projects + verification.

export type ProjectType = "PUBLIC" | "PRIVATE";

export const VERIFICATION_STATUSES = [
  "NOT_VERIFIED", "VERIFICATION_PENDING", "VERIFIED", "PARTIALLY_VERIFIED", "FAILED", "INACCESSIBLE",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const PROJECTS_MAX = 5;
export const PROJECT_TECHNOLOGIES_MAX = 10;
export const PROJECT_DESCRIPTION_MIN = 40;

export type Project = {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  repoUrl: string | null;
  liveUrl: string | null;
  projectType: ProjectType;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
};

export type ProjectInput = {
  name: string;
  description: string;
  technologies: string[];
  repoUrl: string | null;
  liveUrl: string | null;
  projectType: ProjectType;
};

export type VerificationRequest = { verificationId: string; status: VerificationStatus };

export const projectsService = {
  createProject(input: ProjectInput): Promise<Project> {
    return request({ method: "POST", url: endpoints.projects.create, data: input });
  },
  updateProject(id: string, input: Partial<ProjectInput>): Promise<Project> {
    return request({ method: "PATCH", url: endpoints.projects.byId(id), data: input });
  },
  removeProject(id: string): Promise<{ removed: true }> {
    return request({ method: "DELETE", url: endpoints.projects.byId(id) });
  },
  requestVerification(id: string): Promise<VerificationRequest> {
    return request({ method: "POST", url: endpoints.projects.verifications(id) });
  },
};
