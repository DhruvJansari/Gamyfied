// Every query key in the app is built here (project/Rules.md). Never write a key inline.

export const queryKeys = {
  me: ["me"] as const,
  profile: {
    /** The signed-in user's own profile (owner view). */
    me: ["profile", "me"] as const,
    byHandle: (handle: string) => ["profile", "handle", handle.toLowerCase()] as const,
  },
  leaderboard: {
    /** Prefix for every board query — invalidated together after a score write. */
    all: ["leaderboard"] as const,
    page: (board: string, page: number, tier: string | null) => ["leaderboard", board, "page", tier ?? "all", page] as const,
    search: (board: string, q: string) => ["leaderboard", board, "search", q.toLowerCase()] as const,
    me: (board: string) => ["leaderboard", board, "me"] as const,
  },
} as const;
