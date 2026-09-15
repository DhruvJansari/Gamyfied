import type { NextFunction, Request, RequestHandler, Response } from "express";

import { redis } from "../config/redis";
import { AppError, type ErrorCode } from "../lib/errors";
import { clientIp } from "../lib/http";

type Options = {
  /** Redis key namespace, e.g. "otp-send". */
  name: string;
  /** Max hits per window. */
  limit: number;
  /** Window length in seconds (fixed window — simple and cheap: one INCR + EXPIRE). */
  windowSec: number;
  /** What to bucket by. Defaults to client IP. */
  keyFrom?: (req: Request) => string | undefined;
  code?: ErrorCode;
};

/** Fixed-window counter in Redis. Falls open (allows the request) if Redis is unreachable. */
export function rateLimit(opts: Options): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const subject = opts.keyFrom ? opts.keyFrom(req) : clientIp(req);
    if (!subject) {
      next();
      return;
    }
    const key = `rl:${opts.name}:${subject}`;
    try {
      const hits = await redis.incr(key);
      if (hits === 1) {
        await redis.expire(key, opts.windowSec);
      }
      if (hits > opts.limit) {
        const ttl = await redis.ttl(key);
        next(AppError.rateLimited(Math.max(ttl, 1), opts.code));
        return;
      }
      next();
    } catch (err) {
      console.error("[rate-limit] redis unavailable, allowing request", err);
      next();
    }
  };
}
