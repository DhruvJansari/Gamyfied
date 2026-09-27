import { Router } from "express";

import { handler } from "../../lib/http";
import { rateLimit } from "../../middleware/rate-limit";
import { requireAuth } from "../../middleware/require-auth";
import { validate } from "../../middleware/validate";
import { leaderboardController } from "./leaderboard.controller";
import { boardQuerySchema, pageQuerySchema, searchQuerySchema } from "./leaderboard.schemas";

export const leaderboardRoutes = Router();

// Signed in only: "me" is the session, never a client-supplied id.
leaderboardRoutes.get("/me", requireAuth, validate("query", boardQuerySchema), handler(leaderboardController.getMine));

// Public reads, guests included (Context.md §5.1). The board is the busiest page on the site
// and open to anyone, so both get a per-address ceiling; search hits Postgres, so a lower one.
leaderboardRoutes.get(
  "/search",
  rateLimit({ name: "leaderboard-search", limit: 60, windowSec: 60 }),
  validate("query", searchQuerySchema),
  handler(leaderboardController.search),
);
leaderboardRoutes.get(
  "/",
  rateLimit({ name: "leaderboard-read", limit: 120, windowSec: 60 }),
  validate("query", pageQuerySchema),
  handler(leaderboardController.getPage),
);
