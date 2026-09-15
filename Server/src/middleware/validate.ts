import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";

import { AppError, ErrorCode, type FieldErrors } from "../lib/errors";

type Part = "body" | "query" | "params";

/**
 * Validates one part of the request before the controller runs and replaces it with the
 * parsed (typed, trimmed, defaulted) value. Failures return a field-level error map.
 */
export function validate<T>(part: Part, schema: ZodType<T>): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const fields: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".") || part;
        if (!(key in fields)) fields[key] = issue.message;
      }
      next(AppError.badRequest(ErrorCode.VALIDATION_FAILED, "Some fields need attention", fields));
      return;
    }
    // Express 5 exposes `query` as a getter, so the parsed value is stored on res.locals-free
    // slots the controllers read via `validated(req)`.
    (req as Request & { validated?: Partial<Record<Part, unknown>> }).validated ??= {};
    (req as Request & { validated: Partial<Record<Part, unknown>> }).validated[part] = result.data;
    next();
  };
}

/** Typed accessor for the value `validate()` stored. */
export function validated<T>(req: Request, part: Part = "body"): T {
  const store = (req as Request & { validated?: Partial<Record<Part, unknown>> }).validated;
  return store?.[part] as T;
}
