import { z } from "zod";

import { optionalHttpsUrl, optionalText } from "../../lib/zod-helpers";

/** PUT /profiles/me — partial: only the fields present are written. */
export const updateProfileSchema = z.object({
  avatarUrl: optionalHttpsUrl("Avatar URL"),
  headline: optionalText(120, "Headline"),
  bio: optionalText(2000, "Bio"),
  location: optionalText(80, "Location"),
  websiteUrl: optionalHttpsUrl("Website"),
  yearsOfExperience: z.number().int().min(0, "Cannot be negative").max(60, "That is a lot of years").nullable().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const handleParamsSchema = z.object({
  handle: z.string().trim().min(3).max(24),
});
