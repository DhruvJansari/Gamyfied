import { Router } from "express";

import { handler, ok } from "../../lib/http";
import { rateLimit } from "../../middleware/rate-limit";
import { requireAuth } from "../../middleware/require-auth";
import { validate, validated } from "../../middleware/validate";
import { updateMeSchema, type UpdateMeInput } from "./users.schemas";
import { usersService } from "./users.service";

export const usersRoutes = Router();

usersRoutes.get(
  "/me",
  requireAuth,
  handler(async (req, res) => {
    ok(res, await usersService.getMe(req.user!.id));
  }),
);

usersRoutes.patch(
  "/me",
  requireAuth,
  rateLimit({ name: "users-me-write", limit: 20, windowSec: 60 * 60, keyFrom: (req) => req.user?.id }),
  validate("body", updateMeSchema),
  handler(async (req, res) => {
    ok(res, await usersService.updateMe(req.user!.id, validated<UpdateMeInput>(req)));
  }),
);
