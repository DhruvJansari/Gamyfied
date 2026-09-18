import { request } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

// Mirrors Server/src/modules/social-links. Platform detection is the server's call; the
// client only previews it (lib/social-platforms.ts).

export const SOCIAL_PLATFORMS = [
  "GITHUB", "GITLAB", "LINKEDIN", "LEETCODE", "CODEFORCES", "STACKOVERFLOW",
  "HACKERRANK", "KAGGLE", "DEVTO", "HASHNODE", "MEDIUM", "X",
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export type TrustLevel = "CLAIMED" | "LINKED" | "VERIFIED";

export const SOCIAL_LINKS_MAX = 4;

export type SocialLink = {
  id: string;
  platform: SocialPlatform;
  label: string;
  url: string;
  username: string;
  trustLevel: TrustLevel;
  /** LINKED rows come from OAuth and cannot be removed here. */
  isReadOnly: boolean;
  createdAt: string;
};

export const socialLinksService = {
  addSocialLink(url: string): Promise<SocialLink> {
    return request({ method: "POST", url: endpoints.socialLinks.create, data: { url } });
  },
  removeSocialLink(id: string): Promise<{ removed: true }> {
    return request({ method: "DELETE", url: endpoints.socialLinks.byId(id) });
  },
};
