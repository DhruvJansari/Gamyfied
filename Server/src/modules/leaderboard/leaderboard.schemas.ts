import { z } from "zod";

import { BOARD_KEYS, DEFAULT_BOARD } from "./boards.config";
import { TIER_LETTERS } from "./tier.config";

/** GET /leaderboard/me?board= */
export const boardQuerySchema = z.object({
  board: z.enum(BOARD_KEYS).default(DEFAULT_BOARD),
});
export type BoardQuery = z.infer<typeof boardQuerySchema>;

/** GET /leaderboard?board=&page=&tier= — a page past the end is empty, not an error. */
export const pageQuerySchema = boardQuerySchema.extend({
  page: z.coerce.number().int("Page must be a whole number").min(1, "Pages start at 1").max(100_000, "That page does not exist").default(1),
  /** Whole tiers only (S, A, …), never a band (A+): the filter is the letter. */
  tier: z.enum(TIER_LETTERS).optional(),
});
export type PageQuery = z.infer<typeof pageQuerySchema>;

/** GET /leaderboard/search?board=&q= */
export const searchQuerySchema = boardQuerySchema.extend({
  q: z.string().trim().min(1, "Type a name or an ID").max(60, "That is too long to be a name or an ID"),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;
