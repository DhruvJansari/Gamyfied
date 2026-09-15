import type { NextFunction, Request, Response } from "express";

import { AppError, ErrorCode } from "../lib/errors";
import { fail } from "../lib/http";

/** The only place an error becomes a response (Project/Rules.md, Error handling). */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    if (err.status >= 500) {
      console.error(`[error] ${req.method} ${req.path}`, err);
    }
    if (err.retryAfterSec) {
      res.setHeader("Retry-After", String(err.retryAfterSec));
    }
    fail(res, err.status, err.code, err.message, err.fields);
    return;
  }

  // Malformed JSON body from express.json()
  if (typeof err === "object" && err !== null && "type" in err && err.type === "entity.parse.failed") {
    fail(res, 400, ErrorCode.VALIDATION_FAILED, "Request body is not valid JSON");
    return;
  }

  console.error(`[error] ${req.method} ${req.path} unexpected`, err);
  fail(res, 500, ErrorCode.INTERNAL, "Something went wrong on our side");
}

export function notFoundHandler(_req: Request, res: Response): void {
  fail(res, 404, ErrorCode.NOT_FOUND, "Route not found");
}
