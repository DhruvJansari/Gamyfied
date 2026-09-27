// The only file in the app that contains a URL (project/Rules.md, Centralized API access).
// Paths are relative to the /api rewrite in next.config.ts.

export const endpoints = {
  auth: {
    otpSend: "/api/auth/otp/send",
    otpVerify: "/api/auth/otp/verify",
    refresh: "/api/auth/refresh",
    logout: "/api/auth/logout",
    logoutAll: "/api/auth/logout-all",
    /** Full-page navigation, not an XHR: the API redirects to the provider. */
    oauthStart: (provider: "github" | "google", returnTo?: string) =>
      `/api/auth/${provider}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`,
  },
  users: {
    me: "/api/users/me",
  },
  onboarding: {
    submit: "/api/onboarding",
  },
  profiles: {
    /** GET = owner view, PUT = update fields. */
    me: "/api/profiles/me",
    byHandle: (handle: string) => `/api/profiles/${encodeURIComponent(handle)}`,
  },
  socialLinks: {
    create: "/api/social-links",
    byId: (id: string) => `/api/social-links/${id}`,
  },
  projects: {
    create: "/api/projects",
    byId: (id: string) => `/api/projects/${id}`,
    verifications: (id: string) => `/api/projects/${id}/verifications`,
  },
  participations: {
    create: "/api/participations",
    byId: (id: string) => `/api/participations/${id}`,
    verifications: (id: string) => `/api/participations/${id}/verifications`,
  },
  leaderboard: {
    page: (board: string, page: number, tier: string | null) =>
      `/api/leaderboard?board=${encodeURIComponent(board)}&page=${page}${tier ? `&tier=${encodeURIComponent(tier)}` : ""}`,
    search: (board: string, q: string) => `/api/leaderboard/search?board=${encodeURIComponent(board)}&q=${encodeURIComponent(q)}`,
    me: (board: string) => `/api/leaderboard/me?board=${encodeURIComponent(board)}`,
  },
} as const;
