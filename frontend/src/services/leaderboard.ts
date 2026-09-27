import { request } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { Placement } from "./profiles";
import type { SocialPlatform } from "./social-links";

// Mirrors Server/src/modules/leaderboard/leaderboard.dto.ts.

export type BoardKey = "global";
export const DEFAULT_BOARD: BoardKey = "global";

export type TierLetter = "S" | "A" | "B" | "C" | "D" | "E";
export const TIER_LETTERS: readonly TierLetter[] = ["S", "A", "B", "C", "D", "E"];

/** Mirror of Server/src/modules/leaderboard/tier.config.ts TIER_NAMES, for the filter rail. */
export const TIER_NAMES: Record<TierLetter, string> = {
  S: "Legend",
  A: "Champion",
  B: "Vanguard",
  C: "Challenger",
  D: "Rookie",
  E: "Recruit",
};

/** Mirror of tier.config.ts TIER_RULES, collapsed to a tier's rank span. Legend copy only. */
export const TIER_RANKS: Record<TierLetter, string> = {
  S: "Ranks 1–20",
  A: "Ranks 21–200",
  B: "Ranks 201–1,000",
  C: "Ranks 1,001–5,000",
  D: "Ranks 5,001–20,000",
  E: "Below 20,000",
};

/** `label` is the band ("A+"), `name` the tier's title ("Champion"). */
export type Tier = { tier: TierLetter; label: string; name: string };

/** Platform-owned: rendered by the platform layer of a row, never by a user's card. */
export type LeaderboardRowData = {
  rank: number;
  tier: Tier;
  score: number;
  /** "#7K2M9QX" */
  publicId: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  linkedPlatforms: SocialPlatform[];
};

/** User-owned. Null until custom cards ship. */
export type LeaderboardRowPresentation = null;

export type LeaderboardRow = {
  data: LeaderboardRowData;
  presentation: LeaderboardRowPresentation;
};

export type LeaderboardPage = {
  board: BoardKey;
  tier: TierLetter | null;
  page: number;
  pageSize: number;
  lastPage: number;
  totalRanked: number;
  updatedAt: string | null;
  podium: LeaderboardRow[];
  rows: LeaderboardRow[];
};

export type LeaderboardSearch = {
  board: BoardKey;
  q: string;
  rows: LeaderboardRow[];
};

/** A user's own standing; also embedded in both profile views as `ranking`. */
export type Ranking = {
  board: BoardKey;
  rank: number;
  tier: Tier;
  totalRanked: number;
  /** The leaderboard page this rank appears on. */
  page: number;
};

export type MyRank =
  | {
      board: BoardKey;
      status: "RANKED";
      rank: number;
      tier: Tier;
      topPercent: number;
      score: number;
      totalRanked: number;
      page: number;
      previous: { rank: number; capturedAt: string } | null;
      neighbours: LeaderboardRow[];
    }
  | { board: BoardKey; status: "UNRANKED"; placement: Placement };

export const leaderboardService = {
  getPage(board: BoardKey, page: number, tier: TierLetter | null): Promise<LeaderboardPage> {
    return request({ method: "GET", url: endpoints.leaderboard.page(board, page, tier) });
  },
  search(board: BoardKey, q: string): Promise<LeaderboardSearch> {
    return request({ method: "GET", url: endpoints.leaderboard.search(board, q) });
  },
  getMyRank(board: BoardKey): Promise<MyRank> {
    return request({ method: "GET", url: endpoints.leaderboard.me(board) });
  },
};
