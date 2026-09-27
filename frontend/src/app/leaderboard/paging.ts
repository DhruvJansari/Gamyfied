import { TIER_LETTERS, type TierLetter } from "@/services/leaderboard";

// The board's URL state (project/Rules.md, State ownership): `?tier=A&page=2&q=rohan`.
// Used by the route (server) and the view (client) alike, so no "use client" here.

type Raw = string | string[] | null | undefined;

const first = (raw: Raw) => (Array.isArray(raw) ? raw[0] : raw) ?? "";

/** `?page=` as a positive integer; anything else is page 1. */
export function parsePage(raw: Raw): number {
  const n = Number(first(raw));
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** `?tier=` as a tier letter; anything else is the whole board. */
export function parseTier(raw: Raw): TierLetter | null {
  const value = first(raw).toUpperCase();
  return (TIER_LETTERS as readonly string[]).includes(value) ? (value as TierLetter) : null;
}

/** `?q=` trimmed and bounded, the same way the API bounds it. */
export function parseQuery(raw: Raw): string {
  return first(raw).trim().slice(0, 60);
}

export type BoardLocation = { page: number; tier: TierLetter | null; q: string };

/** The query string for a location, or "" for the board's front page. */
export function boardSearch({ page, tier, q }: BoardLocation): string {
  const params = new URLSearchParams();
  if (tier) params.set("tier", tier);
  if (page > 1) params.set("page", String(page));
  if (q) params.set("q", q);
  const s = params.toString();
  return s ? `?${s}` : "";
}
