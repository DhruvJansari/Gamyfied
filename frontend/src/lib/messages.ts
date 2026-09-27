import { ErrorCode, type ErrorCode as Code } from "./api/errors";

// Every user-facing error string lives here, keyed by code (project/Rules.md, Error handling).
// Each message says what happened and what to do next.

const CATALOG: Partial<Record<Code, string>> = {
  [ErrorCode.VALIDATION_FAILED]: "Some fields need attention. Check the highlighted ones and try again.",
  [ErrorCode.RATE_LIMITED]: "Too many attempts. Wait a moment and try again.",
  [ErrorCode.UNAUTHENTICATED]: "You need to sign in to do that.",
  [ErrorCode.REFRESH_INVALID]: "Your session ended. Sign in again to continue.",
  [ErrorCode.FORBIDDEN]: "You don't have access to that.",
  [ErrorCode.OTP_INVALID]: "That code isn't right. Check it and try again.",
  [ErrorCode.OTP_EXPIRED]: "That code has expired. Request a new one.",
  [ErrorCode.OTP_TOO_MANY_ATTEMPTS]: "Too many wrong attempts. Request a new code.",
  [ErrorCode.OTP_RESEND_TOO_SOON]: "A code was just sent. Wait a minute before requesting another.",
  [ErrorCode.OTP_SEND_FAILED]: "We couldn't send the code. Check the address and try again.",
  [ErrorCode.SMS_UNAVAILABLE]: "SMS sign-in is unavailable right now. Use your email instead.",
  [ErrorCode.ACCOUNT_NOT_FOUND]: "No account uses that yet. Create one to continue.",
  [ErrorCode.ACCOUNT_EXISTS]: "An account with those details already exists. Sign in instead.",
  [ErrorCode.OAUTH_PROVIDER_DISABLED]: "That sign-in method isn't available right now. Use another one.",
  [ErrorCode.OAUTH_STATE_INVALID]: "That sign-in link expired. Start again.",
  [ErrorCode.OAUTH_EXCHANGE_FAILED]: "Sign-in with that provider didn't complete. Try again.",
  [ErrorCode.OAUTH_EMAIL_UNVERIFIED]: "That provider account has no verified email. Verify it there, or sign in with your email.",
  [ErrorCode.NOT_FOUND]: "We couldn't find that. It may have been removed.",
  [ErrorCode.HANDLE_TAKEN]: "That handle is already taken. Try another one.",
  [ErrorCode.SOCIAL_PLATFORM_UNSUPPORTED]: "That isn't a supported developer profile. Paste a GitHub, LinkedIn, LeetCode, Stack Overflow or similar profile URL.",
  [ErrorCode.SOCIAL_LINK_DUPLICATE]: "You already have a profile on that platform. Remove it first to replace it.",
  [ErrorCode.SOCIAL_LINK_LIMIT_REACHED]: "You've added the maximum number of profiles. Remove one to add another.",
  [ErrorCode.SOCIAL_LINK_LINKED_READONLY]: "This profile is connected through sign-in and can't be removed here.",
  [ErrorCode.PROJECT_LIMIT_REACHED]: "You've added the maximum number of projects. Remove one to add another.",
  [ErrorCode.PROJECT_REPO_HOST_UNSUPPORTED]: "Use a repository URL on GitHub, GitLab, Bitbucket or Codeberg.",
  [ErrorCode.PARTICIPATION_LIMIT_REACHED]: "You've added the maximum number of entries. Remove one to add another.",
  [ErrorCode.VERIFICATION_ALREADY_PENDING]: "This is already queued for verification. Check back later.",
  [ErrorCode.VERIFICATION_COOLDOWN]: "This was checked recently. You can ask for another check tomorrow.",
  [ErrorCode.NETWORK]: "You appear to be offline. Check your connection and retry.",
  [ErrorCode.TIMEOUT]: "That took too long. Retry in a moment.",
};

const FALLBACK = "Something didn't work on our side. Retry in a moment.";

export function messageFor(code: Code | string | undefined): string {
  return (code && CATALOG[code as Code]) ?? FALLBACK;
}
