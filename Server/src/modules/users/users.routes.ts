import { Router } from "express";

import { handler, ok } from "../../lib/http";
import { requireAuth } from "../../middleware/require-auth";
import { usersService } from "./users.service";

export const usersRoutes = Router();

usersRoutes.get(
  "/me",
  requireAuth,
  handler(async (req, res) => {
    ok(res, await usersService.getMe(req.user!.id));
  }),
);
