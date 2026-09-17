import { Router } from "express";

import { handler } from "../../lib/http";
import { requireAuth } from "../../middleware/require-auth";
import { validate } from "../../middleware/validate";
import { onboardingController } from "./onboarding.controller";
import { submitOnboardingSchema } from "./onboarding.schemas";

export const onboardingRoutes = Router();

// PUT because it is idempotent: the same body twice leaves one identical row.
onboardingRoutes.put("/", requireAuth, validate("body", submitOnboardingSchema), handler(onboardingController.submit));
