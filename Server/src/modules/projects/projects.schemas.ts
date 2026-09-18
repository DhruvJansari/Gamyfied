import { z } from "zod";

import { ProjectType } from "../../generated/prisma/enums";
import { optionalHttpsUrl, tagList } from "../../lib/zod-helpers";
import { PROJECT, PROJECT_TECHNOLOGIES_MAX } from "../scoring/scoring.config";

const fields = {
  name: z.string().trim().min(2, "At least 2 characters").max(80, "At most 80 characters"),
  description: z
    .string()
    .trim()
    .min(PROJECT.minDescriptionLength, `Describe it in at least ${PROJECT.minDescriptionLength} characters`)
    .max(2000, "At most 2000 characters"),
  technologies: tagList(PROJECT_TECHNOLOGIES_MAX, 30),
  repoUrl: optionalHttpsUrl("Repository URL"),
  liveUrl: optionalHttpsUrl("Live URL"),
  projectType: z.enum(ProjectType, { message: "Pick public or private" }),
};

/** POST /projects */
export const createProjectSchema = z.object({
  ...fields,
  technologies: fields.technologies.default([]),
  repoUrl: fields.repoUrl.default(null),
  liveUrl: fields.liveUrl.default(null),
  projectType: fields.projectType.default("PUBLIC"),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

/** PATCH /projects/:id */
export const updateProjectSchema = z.object(fields).partial();
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const projectIdParamsSchema = z.object({ id: z.uuid("Unknown project") });
