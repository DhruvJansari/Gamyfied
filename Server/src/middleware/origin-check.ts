import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env";
import { AppError, ErrorCode } from "../lib/errors";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const allowed = new Set(env.corsOrigins.map((o) => o.trim()));

/**
 * CSRF defence, layer two (layer one is SameSite cookies): a mutating request must come
 * from one of our own origins. Browsers always send Origin on cross-origin and same-origin
 * POSTs made by fetch/XHR; a forged form post from another site fails here.
 * Requests with no Origin at all (curl, server-to-server) are allowed — they carry no cookies.
 */
export function originCheck(req: Request, _res: Response, next: NextFunction): void {
  if (!MUTATING.has(req.method)) {
    next();
    return;
  }
  const origin = req.get("origin");
  if (origin && !allowed.has(origin)) {
    next(AppError.forbidden("Request origin not allowed", ErrorCode.FORBIDDEN_ORIGIN));
    return;
  }
  next();
}
