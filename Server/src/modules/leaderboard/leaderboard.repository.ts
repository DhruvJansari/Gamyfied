import { prisma } from "../../config/db";
import type { Prisma } from "../../generated/prisma/client";
import type { SocialPlatform } from "../../generated/prisma/enums";
import { normalizePublicId } from "../../lib/public-id";

/** The display fields a leaderboard row needs; everything a stranger may see about a user. */
export type RowSource = {
  userId: string;
  publicId: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  /** Platforms proven through sign-in or verification — the badges. */
  linkedPlatforms: SocialPlatform[];
};

const rowSelect = {
  id: true,
  publicId: true,
  handle: true,
  displayName: true,
  profile: { select: { avatarUrl: true } },
  socialLinks: { where: { trustLevel: { not: "CLAIMED" as const } }, select: { platform: true }, orderBy: { platform: "asc" as const } },
} satisfies Prisma.UserSelect;

type RowRecord = Prisma.UserGetPayload<{ select: typeof rowSelect }>;

function toRowSource(u: RowRecord): RowSource {
  return {
    userId: u.id,
    publicId: u.publicId,
    handle: u.handle,
    displayName: u.displayName,
    avatarUrl: u.profile?.avatarUrl ?? null,
    linkedPlatforms: u.socialLinks.map((l) => l.platform),
  };
}

export const leaderboardRepository = {
  /**
   * Hydrates ZSET members into display rows: one query, primary-key lookups. This is the one
   * seam the future card layer plugs into (a join on leaderboard_cards, or a per-user cache in
   * front) — the service and the DTO never change.
   */
  async findRowSourcesByUserIds(userIds: string[]): Promise<Map<string, RowSource>> {
    if (userIds.length === 0) return new Map();
    const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: rowSelect });
    return new Map(users.map((u) => [u.id, toRowSource(u)]));
  },

  /**
   * Ranked users whose name or handle contains the text, or whose public ID is exactly it
   * ("#7K2M9QX", "7k2m9qx"). Ordering by rank happens in the service, from Redis.
   */
  async searchRanked(q: string, limit: number): Promise<RowSource[]> {
    const publicId = normalizePublicId(q);
    const users = await prisma.user.findMany({
      where: {
        score: { is: { isRanked: true } },
        OR: [
          { displayName: { contains: q, mode: "insensitive" } },
          { handle: { contains: q, mode: "insensitive" } },
          ...(publicId ? [{ publicId }] : []),
        ],
      },
      select: rowSelect,
      take: limit,
    });
    return users.map(toRowSource);
  },
};
