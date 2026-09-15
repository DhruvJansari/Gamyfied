import type { NextFunction, Request, RequestHandler, Response } from "express";

import { AppError } from "../lib/errors";
import type { Role } from "../generated/prisma/enums";
import { sessionsService } from "../modules/auth/sessions.service";
import { readAccessCookie, verifyAccessToken, type AccessClaims } from "../modules/auth/tokens";

export type CurrentUser = { id: string; sid: string; role: Role };

declare module "express-serve-static-core" {
  interface Request {
    /** Set by requireAuth / optionalAuth. Identity always comes from here, never from the body. */
    user?: CurrentUser;
  }
}

function toCurrentUser(claims: AccessClaims): CurrentUser {
  return { id: claims.sub, sid: claims.sid, role: claims.role };
}

/** Verifies the access JWT (no DB) and checks the Redis revocation denylist (one GET). */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = readAccessCookie(req);
  if (!token) {
    next(AppError.unauthenticated());
    return;
  }
  try {
    const claims = verifyAccessToken(token);
    if (await sessionsService.isRevoked(claims.sid)) {
      next(AppError.unauthenticated());
      return;
    }
    req.user = toCurrentUser(claims);
    next();
  } catch (err) {
    next(err);
  }
}

/** Same as requireAuth but a missing/invalid token just leaves req.user unset (guest browsing). */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = readAccessCookie(req);
  if (!token) {
    next();
    return;
  }
  try {
    const claims = verifyAccessToken(token);
    if (!(await sessionsService.isRevoked(claims.sid))) {
      req.user = toCurrentUser(claims);
    }
  } catch {
    // Guest: an expired or garbage cookie is not an error on a public route.
  }
  next();
}

const RANK: Record<Role, number> = { USER: 0, MODERATOR: 1, ADMIN: 2 };

/** Coarse gate only — services re-check role and ownership (Project/Rules.md, Security). */
export function requireRole(min: Role): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(AppError.unauthenticated());
      return;
    }
    if (RANK[req.user.role] < RANK[min]) {
      next(AppError.forbidden());
      return;
    }
    next();
  };
}
