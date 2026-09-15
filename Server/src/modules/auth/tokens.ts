import type { Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../../config/env";
import { AppError, ErrorCode } from "../../lib/errors";
import type { Role } from "../../generated/prisma/enums";

// Lifetimes (Project/Auth.md). Access is short so revocation lag stays small; refresh slides.
export const ACCESS_TTL_SEC = 30 * 60;
export const REFRESH_TTL_SEC = 7 * 24 * 60 * 60;
export const REFRESH_ABSOLUTE_MAX_SEC = 30 * 24 * 60 * 60;

export const ACCESS_COOKIE = "gf_access";
export const REFRESH_COOKIE = "gf_refresh";
/** The refresh cookie is only ever sent to the auth routes. */
export const REFRESH_COOKIE_PATH = "/api/auth";
/**
 * Holds no secret (value "1"), is readable by JS and by the Next.js proxy. It only says
 * "a refresh session probably exists", so the client knows a refresh is worth trying after
 * the access cookie has expired and been dropped by the browser.
 */
export const SESSION_MARKER_COOKIE = "gf_session";

export type AccessClaims = {
  sub: string; // user id
  sid: string; // session id
  role: Role;
};

export function signAccessToken(claims: AccessClaims): string {
  return jwt.sign(claims, env.jwtSecret, { algorithm: "HS256", expiresIn: ACCESS_TTL_SEC });
}

/** Throws ACCESS_TOKEN_EXPIRED or UNAUTHENTICATED; the caller decides what to do with each. */
export function verifyAccessToken(token: string): AccessClaims {
  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] });
    if (typeof payload !== "object" || typeof payload.sub !== "string" || typeof payload.sid !== "string") {
      throw AppError.unauthenticated();
    }
    return { sub: payload.sub, sid: payload.sid, role: payload.role as Role };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw AppError.unauthenticated(ErrorCode.ACCESS_TOKEN_EXPIRED, "Session needs a refresh");
    }
    if (err instanceof AppError) throw err;
    throw AppError.unauthenticated();
  }
}

const baseCookie = {
  httpOnly: true,
  secure: env.isProduction,
  // Domain is intentionally never set: the user-content origin must not receive these.
} as const;

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookie,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TTL_SEC * 1000,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookie,
    sameSite: "strict",
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_TTL_SEC * 1000,
  });
  res.cookie(SESSION_MARKER_COOKIE, "1", {
    httpOnly: false,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TTL_SEC * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookie, sameSite: "lax", path: "/" });
  res.clearCookie(REFRESH_COOKIE, { ...baseCookie, sameSite: "strict", path: REFRESH_COOKIE_PATH });
  res.clearCookie(SESSION_MARKER_COOKIE, { httpOnly: false, secure: env.isProduction, sameSite: "lax", path: "/" });
}

export function readAccessCookie(req: Request): string | undefined {
  return (req.cookies as Record<string, string | undefined>)[ACCESS_COOKIE];
}

export function readRefreshCookie(req: Request): string | undefined {
  return (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
}
