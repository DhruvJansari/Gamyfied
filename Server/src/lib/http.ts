import type { NextFunction, Request, RequestHandler, Response } from "express";

import type { ErrorCode, FieldErrors } from "./errors";

// Every response, success or failure, uses this envelope (Project/Rules.md, Responses).
export type SuccessEnvelope<T> = { ok: true; data: T };
export type ErrorEnvelope = { ok: false; error: { code: ErrorCode; message: string; fields?: FieldErrors } };

export function ok<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ ok: true, data } satisfies SuccessEnvelope<T>);
}

export function fail(res: Response, status: number, code: ErrorCode, message: string, fields?: FieldErrors): void {
  const body: ErrorEnvelope = { ok: false, error: fields ? { code, message, fields } : { code, message } };
  res.status(status).json(body);
}

/** Express 5 forwards rejected promises to the error middleware; this just keeps the signature typed. */
export function handler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler {
  return fn;
}

/** Client IP with the reverse proxy already accounted for by `trust proxy`. */
export function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}
