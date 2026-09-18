// Error codes mirror Server/src/lib/errors.ts. The client interceptor normalizes every
// failure into ApiError; components never see a raw axios error.

export const ErrorCode = {
  VALIDATION_FAILED: "VALIDATION_FAILED",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  ACCESS_TOKEN_EXPIRED: "ACCESS_TOKEN_EXPIRED",
  REFRESH_INVALID: "REFRESH_INVALID",
  REFRESH_RACE: "REFRESH_RACE",
  FORBIDDEN: "FORBIDDEN",
  FORBIDDEN_ORIGIN: "FORBIDDEN_ORIGIN",
  OTP_INVALID: "OTP_INVALID",
  OTP_EXPIRED: "OTP_EXPIRED",
  OTP_TOO_MANY_ATTEMPTS: "OTP_TOO_MANY_ATTEMPTS",
  OTP_RESEND_TOO_SOON: "OTP_RESEND_TOO_SOON",
  OTP_SEND_FAILED: "OTP_SEND_FAILED",
  ACCOUNT_NOT_FOUND: "ACCOUNT_NOT_FOUND",
  ACCOUNT_EXISTS: "ACCOUNT_EXISTS",
  OAUTH_PROVIDER_DISABLED: "OAUTH_PROVIDER_DISABLED",
  OAUTH_STATE_INVALID: "OAUTH_STATE_INVALID",
  OAUTH_EXCHANGE_FAILED: "OAUTH_EXCHANGE_FAILED",
  OAUTH_EMAIL_UNVERIFIED: "OAUTH_EMAIL_UNVERIFIED",
  REAUTH_REQUIRED: "REAUTH_REQUIRED",
  HANDLE_TAKEN: "HANDLE_TAKEN",
  // Profile
  SOCIAL_PLATFORM_UNSUPPORTED: "SOCIAL_PLATFORM_UNSUPPORTED",
  SOCIAL_LINK_DUPLICATE: "SOCIAL_LINK_DUPLICATE",
  SOCIAL_LINK_LIMIT_REACHED: "SOCIAL_LINK_LIMIT_REACHED",
  SOCIAL_LINK_LINKED_READONLY: "SOCIAL_LINK_LINKED_READONLY",
  PROJECT_LIMIT_REACHED: "PROJECT_LIMIT_REACHED",
  PROJECT_REPO_HOST_UNSUPPORTED: "PROJECT_REPO_HOST_UNSUPPORTED",
  PARTICIPATION_LIMIT_REACHED: "PARTICIPATION_LIMIT_REACHED",
  VERIFICATION_ALREADY_PENDING: "VERIFICATION_ALREADY_PENDING",
  VERIFICATION_COOLDOWN: "VERIFICATION_COOLDOWN",
  // Client-side only
  NETWORK: "NETWORK",
  TIMEOUT: "TIMEOUT",
  UNKNOWN: "UNKNOWN",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  /** Field-level messages from server validation, keyed by field name. */
  readonly fields: Record<string, string>;
  readonly retryAfterSec: number | null;

  constructor(input: { code: ErrorCode; status: number; message: string; fields?: Record<string, string>; retryAfterSec?: number | null }) {
    super(input.message);
    this.name = "ApiError";
    this.code = input.code;
    this.status = input.status;
    this.fields = input.fields ?? {};
    this.retryAfterSec = input.retryAfterSec ?? null;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}
