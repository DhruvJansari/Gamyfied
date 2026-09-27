import { prisma } from "../../config/db";
import type { Prisma, Score, ScoreComponent } from "../../generated/prisma/client";
import type { ScoreDomain } from "../../generated/prisma/enums";
import { BASE_SCORE } from "./scoring.config";
import type { ScoreBreakdown } from "./scoring.types";

export type { Score, ScoreComponent };

export type PersistResult = {
  component: ScoreComponent;
  score: Score;
  /** `total` holds a different value than before this write. */
  totalChanged: boolean;
  /** Crossed the placement gate on this write. */
  becameRanked: boolean;
};

/** What the leaderboard needs to (re)build a board from Postgres. */
export type RankedScoreRow = Pick<Score, "userId" | "total" | "totalChangedAt">;

/**
 * total = base + Σ score_components.points. The one place the aggregate is written: every
 * domain writer (profile today; activity, clan, event later) upserts its component and lands
 * here, so nothing downstream ever learns a new domain exists. `isRanked` is sticky — once a
 * user is ranked, a later recompute that would fail placement does not unrank them — and only
 * a caller that evaluated placement passes `placementPassed`.
 */
async function recomputeTotal(tx: Prisma.TransactionClient, userId: string, opts: { placementPassed?: boolean } = {}): Promise<Omit<PersistResult, "component">> {
  const [current, sum] = await Promise.all([
    tx.score.findUnique({ where: { userId } }),
    tx.scoreComponent.aggregate({ where: { userId }, _sum: { points: true } }),
  ]);
  const base = current?.base ?? BASE_SCORE;
  const total = base + (sum._sum.points ?? 0);
  const totalChanged = current?.total !== total;
  const becameRanked = opts.placementPassed === true && !current?.isRanked;
  const now = new Date();

  const score = await tx.score.upsert({
    where: { userId },
    create: { userId, base, total, totalChangedAt: now, isRanked: becameRanked, rankedAt: becameRanked ? now : null },
    update: {
      total,
      ...(totalChanged ? { totalChangedAt: now } : {}),
      ...(becameRanked ? { isRanked: true, rankedAt: now } : {}),
    },
  });
  return { score, totalChanged, becameRanked };
}

export const scoringRepository = {
  findComponent(userId: string, domain: ScoreDomain): Promise<ScoreComponent | null> {
    return prisma.scoreComponent.findUnique({ where: { userId_domain: { userId, domain } } });
  },

  findScore(userId: string): Promise<Score | null> {
    return prisma.score.findUnique({ where: { userId } });
  },

  /** Writes the PROFILE component and the aggregate together, in one transaction. */
  persist(userId: string, breakdown: ScoreBreakdown, placementPassed: boolean): Promise<PersistResult> {
    return prisma.$transaction(async (tx) => {
      const component = await tx.scoreComponent.upsert({
        where: { userId_domain: { userId, domain: "PROFILE" } },
        create: { userId, domain: "PROFILE", points: breakdown.total, breakdown, rulesVersion: breakdown.rulesVersion },
        update: { points: breakdown.total, breakdown, rulesVersion: breakdown.rulesVersion, computedAt: new Date() },
      });
      return { component, ...(await recomputeTotal(tx, userId, { placementPassed })) };
    });
  },

  /** Every ranked user, in stable batches, for rebuilding a board. */
  async *iterateRanked(batchSize: number): AsyncGenerator<RankedScoreRow[]> {
    let cursor: string | undefined;
    for (;;) {
      const rows = await prisma.score.findMany({
        where: { isRanked: true },
        select: { userId: true, total: true, totalChangedAt: true },
        orderBy: { userId: "asc" },
        take: batchSize,
        ...(cursor ? { cursor: { userId: cursor }, skip: 1 } : {}),
      });
      if (rows.length === 0) return;
      yield rows;
      if (rows.length < batchSize) return;
      cursor = rows[rows.length - 1]!.userId;
    }
  },
};
