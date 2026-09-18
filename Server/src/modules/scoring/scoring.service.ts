import { AppError } from "../../lib/errors";
import { evaluatePlacement, type PlacementResult } from "../placement/placement.engine";
import { invalidateProfileCaches } from "../profiles/profiles.cache";
import { computeProfileScore } from "./scoring.engine";
import { scoringRepository, type ProfileScore, type Score } from "./scoring.repository";
import type { ScoreBreakdown } from "./scoring.types";
import { loadProfileRows, toSnapshot, type ProfileRows } from "./snapshot";

export type Recomputed = {
  rows: ProfileRows;
  breakdown: ScoreBreakdown;
  placement: PlacementResult;
  profileScore: ProfileScore;
  score: Score;
};

export const scoringService = {
  /**
   * Rebuilds the profile score and the aggregate from current state, then drops the cached
   * views. Every profile write calls this.
   *
   * Runs inline in the request rather than as a job (Project/Rules.md, Background work): it is
   * a handful of indexed reads plus a pure function, well under the cost of the write that
   * triggered it. It takes nothing but a userId so a job can call it unchanged later.
   */
  async recomputeProfileScore(userId: string): Promise<Recomputed> {
    const rows = await loadProfileRows(userId);
    if (!rows) throw AppError.notFound("Profile not found");
    return this.recomputeFromRows(rows);
  },

  /** Same, for callers that already hold fresh rows (avoids a second load). */
  async recomputeFromRows(rows: ProfileRows): Promise<Recomputed> {
    const snapshot = toSnapshot(rows);
    const breakdown = computeProfileScore(snapshot);
    const placement = evaluatePlacement(snapshot);
    const { profileScore, score } = await scoringRepository.persist(rows.user.id, breakdown, placement.isRanked);
    await invalidateProfileCaches(rows.user.id, rows.user.handle);
    return { rows, breakdown, placement, profileScore, score };
  },
};
