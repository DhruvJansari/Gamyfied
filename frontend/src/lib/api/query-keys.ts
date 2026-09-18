// Every query key in the app is built here (project/Rules.md). Never write a key inline.

export const queryKeys = {
  me: ["me"] as const,
  profile: {
    /** The signed-in user's own profile (owner view). */
    me: ["profile", "me"] as const,
    byHandle: (handle: string) => ["profile", "handle", handle.toLowerCase()] as const,
  },
} as const;
