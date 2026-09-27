import type { SocialPlatform } from "../../generated/prisma/enums";
import type { PlacementResult } from "../placement/placement.engine";
import type { BoardKey } from "./boards.config";
import type { RowSource } from "./leaderboard.repository";
import type { TierLetter } from "./tier.config";
import { tierForRank, type TierResult } from "./tier.engine";

/** `label` is the band ("A+"), `name` the tier's title ("Champion"). */
export type TierDto = { tier: TierLetter; label: string; name: string };

export function toTierDto(t: TierResult): TierDto {
  return { tier: t.tier, label: t.label, name: t.name };
}

/**
 * Platform-owned. Every field here is rendered by the platform's own layer on the page and can
 * never be hidden, moved or restated by a user's card — that is the whole point of the split.
 */
export type LeaderboardRowData = {
  rank: number;
  tier: TierDto;
  score: number;
  /** "#7K2M9QX" */
  publicId: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  linkedPlatforms: SocialPlatform[];
};

/**
 * User-owned. Null until custom cards ship; then a discriminated union, e.g.
 * `{ kind: "css"; css: string; config: CardConfig } | { kind: "iframe"; src: string }`
 * — sanitised CSS for list rows, a sandboxed separate-origin frame for the podium.
 */
export type LeaderboardRowPresentation = null;

export type LeaderboardRowDto = {
  data: LeaderboardRowData;
  presentation: LeaderboardRowPresentation;
};

export type LeaderboardPageDto = {
  board: BoardKey;
  /** The tier the page is filtered to, or null for the whole board. */
  tier: TierLetter | null;
  page: number;
  pageSize: number;
  /** Last page inside the current scope (whole board or the filtered tier). */
  lastPage: number;
  totalRanked: number;
  /** When the board last changed; null until the first write. */
  updatedAt: string | null;
  /** Ranks 1–3, only on the unfiltered page 1. Their own layout, and later their own presentation kind. */
  podium: LeaderboardRowDto[];
  rows: LeaderboardRowDto[];
};

export type LeaderboardSearchDto = {
  board: BoardKey;
  q: string;
  /** Best rank first, capped. */
  rows: LeaderboardRowDto[];
};

/** A user's own standing on one board; also embedded in the profile views. */
export type RankingDto = {
  board: BoardKey;
  rank: number;
  tier: TierDto;
  totalRanked: number;
  /** The leaderboard page this rank appears on. */
  page: number;
};

export type MyRankDto =
  | {
      board: BoardKey;
      status: "RANKED";
      rank: number;
      tier: TierDto;
      /** "Top 12%". */
      topPercent: number;
      score: number;
      totalRanked: number;
      /** The page this rank appears on. */
      page: number;
      /** Where the user stood before their last change, if there was one. */
      previous: { rank: number; capturedAt: string } | null;
      /** rank−2 … rank+2, the user included. */
      neighbours: LeaderboardRowDto[];
    }
  | {
      board: BoardKey;
      status: "UNRANKED";
      placement: PlacementResult;
    };

export function toRowDto(entry: { rank: number; total: number }, source: RowSource, totalRanked: number): LeaderboardRowDto {
  return {
    data: {
      rank: entry.rank,
      tier: toTierDto(tierForRank(entry.rank, totalRanked)),
      score: entry.total,
      publicId: `#${source.publicId}`,
      handle: source.handle,
      displayName: source.displayName,
      avatarUrl: source.avatarUrl,
      linkedPlatforms: source.linkedPlatforms,
    },
    presentation: null,
  };
}
