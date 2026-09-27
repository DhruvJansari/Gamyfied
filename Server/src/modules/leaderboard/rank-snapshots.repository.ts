import { prisma } from "../../config/db";
import type { RankSnapshot } from "../../generated/prisma/client";
import type { RankSnapshotReason } from "../../generated/prisma/enums";

export type { RankSnapshot };

export type NewRankSnapshot = {
  boardKey: string;
  userId: string;
  rank: number;
  tier: string;
  tierRulesVersion: number;
  score: number;
  totalRanked: number;
  reason: RankSnapshotReason;
};

export const rankSnapshotsRepository = {
  create(input: NewRankSnapshot): Promise<RankSnapshot> {
    return prisma.rankSnapshot.create({ data: input });
  },

  createMany(inputs: NewRankSnapshot[]): Promise<number> {
    return prisma.rankSnapshot.createMany({ data: inputs }).then((r) => r.count);
  },

  /**
   * The user's position as of the snapshot *before* the most recent one — i.e. where they
   * stood before their last change. The latest row is the current position, which is not
   * history yet.
   */
  findPreviousByUser(userId: string, boardKey: string): Promise<RankSnapshot | null> {
    return prisma.rankSnapshot
      .findMany({ where: { userId, boardKey }, orderBy: { capturedAt: "desc" }, skip: 1, take: 1 })
      .then((rows) => rows[0] ?? null);
  },
};
