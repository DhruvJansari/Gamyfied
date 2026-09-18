import { platformSpec } from "../../shared/social-platforms";
import type { SocialLink } from "./social-links.repository";

export type SocialLinkDto = {
  id: string;
  platform: SocialLink["platform"];
  label: string;
  url: string;
  username: string;
  trustLevel: SocialLink["trustLevel"];
  /** LINKED rows come from OAuth and cannot be edited or removed here. */
  isReadOnly: boolean;
  createdAt: string;
};

export function toSocialLinkDto(row: SocialLink): SocialLinkDto {
  return {
    id: row.id,
    platform: row.platform,
    label: platformSpec(row.platform).label,
    url: row.url,
    username: row.username,
    trustLevel: row.trustLevel,
    isReadOnly: row.trustLevel === "LINKED",
    createdAt: row.createdAt.toISOString(),
  };
}
