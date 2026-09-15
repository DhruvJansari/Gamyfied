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
} as const;
