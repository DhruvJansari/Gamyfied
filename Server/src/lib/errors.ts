// The one place error codes are defined (Project/Rules.md, Responses). The frontend maps
// these to user-facing copy, so a code is never renamed casually.

export const ErrorCode = {
  // Generic
  VALIDATION_FAILED: "VALIDATION_FAILED",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL",

  // Auth
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
  SMS_UNAVAILABLE: "SMS_UNAVAILABLE",
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
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export type FieldErrors = Record<string, string>;

/** Thrown by services and controllers; only the error middleware turns it into a response. */
export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly fields?: FieldErrors;
  /** Only set on 429s; becomes the Retry-After header. */
  retryAfterSec?: number;

  constructor(status: number, code: ErrorCode, message: string, fields?: FieldErrors) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  static badRequest(code: ErrorCode, message: string, fields?: FieldErrors): AppError {
    return new AppError(400, code, message, fields);
  }
  static unauthenticated(code: ErrorCode = ErrorCode.UNAUTHENTICATED, message = "Sign in required"): AppError {
    return new AppError(401, code, message);
  }
  static forbidden(message = "You do not have access to this", code: ErrorCode = ErrorCode.FORBIDDEN): AppError {
    return new AppError(403, code, message);
  }
  static notFound(message = "Not found"): AppError {
    return new AppError(404, ErrorCode.NOT_FOUND, message);
  }
  static conflict(code: ErrorCode, message: string, fields?: FieldErrors): AppError {
    return new AppError(409, code, message, fields);
  }
  static rateLimited(retryAfterSec: number, code: ErrorCode = ErrorCode.RATE_LIMITED, message = "Too many requests, slow down"): AppError {
    const err = new AppError(429, code, message);
    err.retryAfterSec = retryAfterSec;
    return err;
  }
}
