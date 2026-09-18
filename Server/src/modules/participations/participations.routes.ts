import { Router } from "express";

import { handler } from "../../lib/http";
import { rateLimit } from "../../middleware/rate-limit";
import { requireAuth } from "../../middleware/require-auth";
import { validate } from "../../middleware/validate";
import { verificationController } from "../verification/verification.controller";
import { participationsController } from "./participations.controller";
import { createParticipationSchema, participationIdParamsSchema, updateParticipationSchema } from "./participations.schemas";

export const participationsRoutes = Router();

const write = rateLimit({ name: "participations-write", limit: 60, windowSec: 60 * 60, keyFrom: (req) => req.user?.id });
const verify = rateLimit({ name: "verification-request", limit: 20, windowSec: 60 * 60, keyFrom: (req) => req.user?.id });

participationsRoutes.post("/", requireAuth, write, validate("body", createParticipationSchema), handler(participationsController.create));
participationsRoutes.patch("/:id", requireAuth, write, validate("params", participationIdParamsSchema), validate("body", updateParticipationSchema), handler(participationsController.update));
participationsRoutes.delete("/:id", requireAuth, write, validate("params", participationIdParamsSchema), handler(participationsController.remove));

participationsRoutes.post("/:id/verifications", requireAuth, verify, validate("params", participationIdParamsSchema), handler(verificationController.requestForParticipation));
