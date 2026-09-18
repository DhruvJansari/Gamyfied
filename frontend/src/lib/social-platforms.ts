// Client-side mirror of Server/src/shared/social-platforms.ts, host list only. Used to show
// "Looks like GitHub" while the user types. The server decides what is actually accepted.

import type { SocialPlatform } from "@/services/social-links";

const HOSTS: Record<SocialPlatform, { label: string; hosts: string[] }> = {
  GITHUB: { label: "GitHub", hosts: ["github.com"] },
  GITLAB: { label: "GitLab", hosts: ["gitlab.com"] },
  LINKEDIN: { label: "LinkedIn", hosts: ["linkedin.com"] },
  LEETCODE: { label: "LeetCode", hosts: ["leetcode.com"] },
  CODEFORCES: { label: "Codeforces", hosts: ["codeforces.com"] },
  STACKOVERFLOW: { label: "Stack Overflow", hosts: ["stackoverflow.com"] },
  HACKERRANK: { label: "HackerRank", hosts: ["hackerrank.com"] },
  KAGGLE: { label: "Kaggle", hosts: ["kaggle.com"] },
  DEVTO: { label: "Dev.to", hosts: ["dev.to"] },
  HASHNODE: { label: "Hashnode", hosts: ["hashnode.com"] },
  MEDIUM: { label: "Medium", hosts: ["medium.com"] },
  X: { label: "X", hosts: ["x.com", "twitter.com"] },
};

export const SUPPORTED_PLATFORM_LABELS = Object.values(HOSTS).map((h) => h.label);

export function platformLabel(platform: SocialPlatform): string {
  return HOSTS[platform].label;
}

/** Best-effort preview of which platform a pasted URL belongs to, by host only. */
export function previewPlatform(input: string): { platform: SocialPlatform; label: string } | null {
  const raw = input.trim();
  if (!raw) return null;
  let host: string;
  try {
    host = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
  for (const [platform, spec] of Object.entries(HOSTS) as [SocialPlatform, { label: string; hosts: string[] }][]) {
    if (spec.hosts.some((h) => host === h || host.endsWith(`.${h}`))) return { platform, label: spec.label };
  }
  return null;
}
