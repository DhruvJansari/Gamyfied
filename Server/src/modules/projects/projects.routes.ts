import { Router } from "express";

import { handler } from "../../lib/http";
import { rateLimit } from "../../middleware/rate-limit";
import { requireAuth } from "../../middleware/require-auth";
import { validate } from "../../middleware/validate";
import { verificationController } from "../verification/verification.controller";
import { projectsController } from "./projects.controller";
import { createProjectSchema, projectIdParamsSchema, updateProjectSchema } from "./projects.schemas";

export const projectsRoutes = Router();

const write = rateLimit({ name: "projects-write", limit: 60, windowSec: 60 * 60, keyFrom: (req) => req.user?.id });
const verify = rateLimit({ name: "verification-request", limit: 20, windowSec: 60 * 60, keyFrom: (req) => req.user?.id });

projectsRoutes.post("/", requireAuth, write, validate("body", createProjectSchema), handler(projectsController.create));
projectsRoutes.patch("/:id", requireAuth, write, validate("params", projectIdParamsSchema), validate("body", updateProjectSchema), handler(projectsController.update));
projectsRoutes.delete("/:id", requireAuth, write, validate("params", projectIdParamsSchema), handler(projectsController.remove));

/** The "Verify project" button. Returns a status reference; the check itself is not synchronous. */
projectsRoutes.post("/:id/verifications", requireAuth, verify, validate("params", projectIdParamsSchema), handler(verificationController.requestForProject));
