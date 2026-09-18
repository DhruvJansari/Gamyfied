import { z } from "zod";

// Field rules shared by the profile-phase schemas. Optional text and URL fields accept an
// empty string as "clear it" and store null, so clients never have to send null themselves.

export const HTTPS_URL = /^https:\/\/[^\s/$.?#].[^\s]*$/i;

export const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters`)
    .transform((s) => (s.length ? s : null))
    .nullable()
    .optional();

export const optionalHttpsUrl = (label: string) =>
  z
    .string()
    .trim()
    .max(500, `${label} is too long`)
    .transform((s) => (s.length ? s : null))
    .nullable()
    .refine((s) => s === null || HTTPS_URL.test(s), { message: `${label} must be an https:// URL` })
    .optional();

/** Free-text tags (stack, technologies): trimmed, bounded, case-insensitively unique. */
export const tagList = (maxItems: number, maxLength: number) =>
  z
    .array(z.string().trim().min(1, "Empty tag").max(maxLength, `At most ${maxLength} characters`))
    .max(maxItems, `At most ${maxItems} items`)
    .transform((tags) => {
      const seen = new Set<string>();
      return tags.filter((tag) => {
        const key = tag.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
