import type { SocialPlatform } from "../generated/prisma/enums";

// The supported-platform registry. A social link is accepted only if its URL matches one of
// these entries — amazon.com or a random blog is not a professional profile. To add a
// platform: add the enum value in schema.prisma, add an entry here, mirror the host list in
// frontend/src/lib/social-platforms.ts. Points are illustrative v1 (see scoring.config.ts).

export type PlatformSpec = {
  platform: SocialPlatform;
  label: string;
  /** Hostnames accepted, matched exactly or as a parent domain (so www./country subdomains work). */
  hosts: readonly string[];
  /** Runs against the pathname (trailing slash removed); group 1 is the username. */
  path: RegExp;
  canonical: (username: string) => string;
  /** Most a link on this platform can be worth when fully verified. */
  maxPoints: number;
  /** We have an OAuth provider for it, so the link can reach LINKED. */
  linkable: boolean;
};

export const SOCIAL_PLATFORMS: readonly PlatformSpec[] = [
  // Code & identity
  {
    platform: "GITHUB",
    label: "GitHub",
    hosts: ["github.com"],
    path: /^\/([A-Za-z\d](?:[A-Za-z\d-]{0,38}))$/,
    canonical: (u) => `https://github.com/${u}`,
    maxPoints: 200,
    linkable: true,
  },
  {
    platform: "GITLAB",
    label: "GitLab",
    hosts: ["gitlab.com"],
    path: /^\/([A-Za-z\d][\w.-]{1,254})$/,
    canonical: (u) => `https://gitlab.com/${u}`,
    maxPoints: 120,
    linkable: false,
  },
  {
    platform: "LINKEDIN",
    label: "LinkedIn",
    hosts: ["linkedin.com"],
    path: /^\/in\/([\w%-]{3,100})$/,
    canonical: (u) => `https://www.linkedin.com/in/${u}`,
    maxPoints: 150,
    linkable: false,
  },
  // Problem-solving
  {
    platform: "LEETCODE",
    label: "LeetCode",
    hosts: ["leetcode.com"],
    path: /^\/(?:u\/)?([\w-]{1,50})$/,
    canonical: (u) => `https://leetcode.com/u/${u}`,
    maxPoints: 150,
    linkable: false,
  },
  {
    platform: "CODEFORCES",
    label: "Codeforces",
    hosts: ["codeforces.com"],
    path: /^\/profile\/([\w.-]{1,50})$/,
    canonical: (u) => `https://codeforces.com/profile/${u}`,
    maxPoints: 150,
    linkable: false,
  },
  {
    platform: "STACKOVERFLOW",
    label: "Stack Overflow",
    hosts: ["stackoverflow.com"],
    // Numeric id is the identity; the display-name segment after it is optional and ignored.
    path: /^\/users\/(\d{1,12})(?:\/[^/]*)?$/,
    canonical: (u) => `https://stackoverflow.com/users/${u}`,
    maxPoints: 150,
    linkable: false,
  },
  {
    platform: "HACKERRANK",
    label: "HackerRank",
    hosts: ["hackerrank.com"],
    path: /^\/(?:profile\/)?(\w{1,50})$/,
    canonical: (u) => `https://www.hackerrank.com/profile/${u}`,
    maxPoints: 100,
    linkable: false,
  },
  {
    platform: "KAGGLE",
    label: "Kaggle",
    hosts: ["kaggle.com"],
    path: /^\/([A-Za-z\d]{1,50})$/,
    canonical: (u) => `https://www.kaggle.com/${u}`,
    maxPoints: 120,
    linkable: false,
  },
  // Writing / presence
  {
    platform: "DEVTO",
    label: "Dev.to",
    hosts: ["dev.to"],
    path: /^\/(\w{1,50})$/,
    canonical: (u) => `https://dev.to/${u}`,
    maxPoints: 80,
    linkable: false,
  },
  {
    platform: "HASHNODE",
    label: "Hashnode",
    hosts: ["hashnode.com"],
    path: /^\/@([\w-]{1,50})$/,
    canonical: (u) => `https://hashnode.com/@${u}`,
    maxPoints: 80,
    linkable: false,
  },
  {
    platform: "MEDIUM",
    label: "Medium",
    hosts: ["medium.com"],
    path: /^\/@([\w.-]{1,50})$/,
    canonical: (u) => `https://medium.com/@${u}`,
    maxPoints: 60,
    linkable: false,
  },
  {
    platform: "X",
    label: "X",
    hosts: ["x.com", "twitter.com"],
    path: /^\/(\w{1,15})$/,
    canonical: (u) => `https://x.com/${u}`,
    maxPoints: 60,
    linkable: false,
  },
];

/** Paths that look like a username on most platforms but are site pages. */
const RESERVED_SEGMENTS = new Set([
  "login", "signin", "sign-in", "signup", "sign-up", "join", "logout", "settings", "account",
  "about", "explore", "search", "new", "home", "feed", "jobs", "pricing", "features", "help",
  "terms", "privacy", "blog", "docs", "api", "contact", "notifications", "marketplace",
  "topics", "trending", "orgs", "sponsors", "pulls", "issues", "discover", "problemset",
  "contest", "contests", "users", "questions", "tags", "companies", "learn", "competitions",
  "datasets", "code", "i", "intent", "share", "hashtag", "tag", "t",
]);

export type DetectedPlatform = { platform: SocialPlatform; username: string; canonicalUrl: string };

const byPlatform = new Map(SOCIAL_PLATFORMS.map((spec) => [spec.platform, spec]));

export function platformSpec(platform: SocialPlatform): PlatformSpec {
  return byPlatform.get(platform)!;
}

function hostMatches(host: string, allowed: readonly string[]): boolean {
  return allowed.some((h) => host === h || host.endsWith(`.${h}`));
}

/**
 * Which supported platform (if any) a pasted URL belongs to. Accepts a missing scheme
 * ("github.com/octocat"), ignores query/fragment, and returns the canonical profile URL so
 * two spellings of the same profile collapse to one row.
 */
export function detectPlatform(input: string): DetectedPlatform | null {
  const raw = input.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  for (const spec of SOCIAL_PLATFORMS) {
    if (!hostMatches(host, spec.hosts)) continue;
    const match = spec.path.exec(pathname);
    const username = match?.[1];
    if (!username || RESERVED_SEGMENTS.has(username.toLowerCase())) return null;
    return { platform: spec.platform, username, canonicalUrl: spec.canonical(username) };
  }
  return null;
}

/** Code hosts a project's repository URL may live on. */
export const REPO_HOSTS: readonly string[] = ["github.com", "gitlab.com", "bitbucket.org", "codeberg.org"];

export function isRepoUrl(input: string): boolean {
  try {
    const url = new URL(input);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    // Needs at least owner/repo in the path.
    return hostMatches(host, REPO_HOSTS) && url.pathname.split("/").filter(Boolean).length >= 2;
  } catch {
    return false;
  }
}
