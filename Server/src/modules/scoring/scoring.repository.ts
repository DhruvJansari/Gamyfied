import { prisma } from "../../config/db";
import type { ProfileScore, Score } from "../../generated/prisma/client";
import { BASE_SCORE } from "./scoring.config";
import type { ScoreBreakdown } from "./scoring.types";

export type { ProfileScore, Score };

export const scoringRepository = {
  findProfileScore(userId: string): Promise<ProfileScore | null> {
    return prisma.profileScore.findUnique({ where: { userId } });
  },

  findScore(userId: string): Promise<Score | null> {
    return prisma.score.findUnique({ where: { userId } });
  },

  /**
   * Writes the profile-domain score and the aggregate together. `isRanked` is sticky: once a
   * user has been ranked, a later recompute that would fail placement does not unrank them.
   */
  persist(userId: string, breakdown: ScoreBreakdown, placementPassed: boolean): Promise<{ profileScore: ProfileScore; score: Score }> {
    return prisma.$transaction(async (tx) => {
      const profileScore = await tx.profileScore.upsert({
        where: { userId },
        create: { userId, points: breakdown.total, breakdown, rulesVersion: breakdown.rulesVersion },
        update: { points: breakdown.total, breakdown, rulesVersion: breakdown.rulesVersion, computedAt: new Date() },
      });

      const current = await tx.score.findUnique({ where: { userId } });
      const base = current?.base ?? BASE_SCORE;
      const becomesRanked = placementPassed && !current?.isRanked;
      const score = await tx.score.upsert({
        where: { userId },
        create: { userId, base, total: base + breakdown.total, isRanked: placementPassed, rankedAt: placementPassed ? new Date() : null },
        update: { total: base + breakdown.total, ...(becomesRanked ? { isRanked: true, rankedAt: new Date() } : {}) },
      });

      return { profileScore, score };
    });
  },
};
