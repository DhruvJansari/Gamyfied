import { z } from "zod";

/** POST /social-links — the server works out the platform; the client only sends the URL. */
export const addSocialLinkSchema = z.object({
  url: z.string().trim().min(1, "Paste a profile URL").max(500, "That URL is too long"),
});
export type AddSocialLinkInput = z.infer<typeof addSocialLinkSchema>;

export const socialLinkIdParamsSchema = z.object({
  id: z.uuid("Unknown link"),
});
