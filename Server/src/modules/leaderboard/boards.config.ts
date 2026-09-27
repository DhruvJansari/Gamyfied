// The board registry. Every leaderboard — global today; per-skill, clan and seasonal boards
// later — is an entry here, and everything downstream (Redis keys, snapshots, endpoints,
// rebuild) is parameterised by its key. Adding a board = an entry + a membership rule.

export type BoardMembership =
  /** Every ranked user. */
  | { kind: "ALL_RANKED" };
// Later: | { kind: "CATEGORY"; category: SkillCategory } | { kind: "CLAN"; clanId: string } ...

export type Board = {
  key: string;
  label: string;
  membership: BoardMembership;
};

export const BOARDS = {
  global: { key: "global", label: "Global", membership: { kind: "ALL_RANKED" } },
} as const satisfies Record<string, Board>;

export type BoardKey = keyof typeof BOARDS;

export const BOARD_KEYS = Object.keys(BOARDS) as [BoardKey, ...BoardKey[]];
export const DEFAULT_BOARD: BoardKey = "global";

export const PAGE_SIZE = 50;
/** Ranks 1..PODIUM_SIZE are returned apart from the rest: they get their own layout. */
export const PODIUM_SIZE = 3;
/** Rows either side of the user on /leaderboard/me. */
export const NEIGHBOUR_SPAN = 2;

/**
 * Which boards a ranked user belongs to. The one place membership is decided; the scoring
 * hook calls it on every write. Later: `["global", ...categories.map(c => `skill:${c}`)]`.
 */
export function boardsForUser(_ctx: { categories: string[] }): BoardKey[] {
  return ["global"];
}

// Redis keys, all derived from the board key so no board is special-cased anywhere.
export const boardKeys = {
  /** ZSET: member = userId, score = encodeBoardScore(total, totalChangedAt). */
  zset: (board: string) => `lb:${board}`,
  /** INCR'd on every sync; part of the page cache key, so a write invalidates all pages implicitly. */
  version: (board: string) => `lb:${board}:ver`,
  updatedAt: (board: string) => `lb:${board}:updated_at`,
  page: (board: string, version: number, page: number, tier: string | null) => `lb:${board}:page:${version}:${tier ?? "all"}:${page}`,
  rebuildTemp: (board: string) => `lb:${board}:rebuild:${Date.now()}`,
  rebuildLock: (board: string) => `lb:${board}:rebuild-lock`,
};
