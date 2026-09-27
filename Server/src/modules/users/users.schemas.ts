import { z } from "zod";

import { displayNameSchema } from "../auth/auth.schemas";

/** Handles that would collide with routes or read as ours. */
export const RESERVED_HANDLES = new Set(["me", "admin", "administrator", "gamyfied", "standbydev", "support", "help", "api", "u", "profile", "settings", "leaderboard"]);

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "At least 3 characters")
  .max(24, "At most 24 characters")
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Letters, numbers and single hyphens only")
  .refine((h) => !RESERVED_HANDLES.has(h), "That handle is reserved");

/** PATCH /users/me */
export const updateMeSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    handle: handleSchema.optional(),
  })
  .refine((v) => v.displayName !== undefined || v.handle !== undefined, { message: "Nothing to update" });
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
