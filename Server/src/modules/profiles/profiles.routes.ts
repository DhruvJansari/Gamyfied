import { Router } from "express";

import { handler } from "../../lib/http";
import { rateLimit } from "../../middleware/rate-limit";
import { optionalAuth, requireAuth } from "../../middleware/require-auth";
import { validate } from "../../middleware/validate";
import { profilesController } from "./profiles.controller";
import { handleParamsSchema, updateProfileSchema } from "./profiles.schemas";

export const profilesRoutes = Router();

// "me" is matched before ":handle"; a user cannot pick the handle "me" (reserved in users.schemas).
profilesRoutes.get("/me", requireAuth, handler(profilesController.getMine));
profilesRoutes.put(
  "/me",
  requireAuth,
  rateLimit({ name: "profile-write", limit: 60, windowSec: 60 * 60, keyFrom: (req) => req.user?.id }),
  validate("body", updateProfileSchema),
  handler(profilesController.updateMine),
);

// Public, guests included. optionalAuth only so a future "you are viewing your own profile"
// flag can be added without changing the route.
profilesRoutes.get("/:handle", optionalAuth, validate("params", handleParamsSchema), handler(profilesController.getByHandle));
