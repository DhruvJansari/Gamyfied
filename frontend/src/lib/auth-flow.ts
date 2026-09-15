import type { Channel, SendOtpInput } from "@/services/auth";

// Glue between the sign-in / sign-up forms and the verify screen.

/** Email or phone? Anything that is only digits, spaces, dashes, brackets and a leading + is a phone. */
export function detectChannel(identifier: string): Channel {
  return /^\+?[\d\s\-()]+$/.test(identifier.trim()) ? "phone" : "email";
}

/** Builds /verify with everything the screen needs in the URL (so a reload survives). */
export function verifyPath(channel: Channel, identifier: string, returnTo?: string | null): string {
  const p = new URLSearchParams({ channel, id: identifier });
  if (returnTo) p.set("returnTo", returnTo);
  return `/verify?${p}`;
}

/** Only same-site relative paths are ever followed after sign-in. */
export function safeReturnTo(raw: string | null | undefined): string {
  return raw && /^\/(?!\/)/.test(raw) ? raw : "/";
}

// The sign-up form's fields have to reach the verify screen so "resend code" can carry
// them again. Form input is local state, not server state, so sessionStorage is the
// right home: it survives a reload and dies with the tab.

const PENDING_KEY = "gf:pending-signup";

export type PendingSignup = Extract<SendOtpInput, { intent: "signup" }>;

export function savePendingSignup(input: PendingSignup): void {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(input));
  } catch {
    // Storage blocked (private mode): resend will fall back to a plain sign-in code.
  }
}

export function readPendingSignup(channel: Channel, identifier: string): PendingSignup | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as PendingSignup;
    return saved.channel === channel && saved.identifier === identifier ? saved : null;
  } catch {
    return null;
  }
}

export function clearPendingSignup(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // Nothing to clear.
  }
}
