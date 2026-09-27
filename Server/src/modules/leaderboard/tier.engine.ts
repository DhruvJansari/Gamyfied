import { TIER_NAMES, TIER_RULES, type TierBand, type TierLetter, type TierRules } from "./tier.config";

export type TierResult = {
  tier: TierLetter;
  label: string;
  name: string;
  /** Today's bounds of the band the rank sits in — lets the UI say "A+ starts at #21". */
  from: number;
  to: number | null;
};

/** Inclusive rank range a whole tier letter spans on a board of `totalRanked`; null when it is empty. */
export function tierBounds(tier: TierLetter, totalRanked: number, rules: TierRules = TIER_RULES): { from: number; to: number } | null {
  const bands = rules.bands.filter((b) => b.tier === tier);
  if (bands.length === 0) return null;
  const from = Math.min(...bands.map((b) => b.from));
  const to = bands.some((b) => b.to === null) ? totalRanked : Math.min(totalRanked, Math.max(...bands.map((b) => b.to!)));
  return to < from ? null : { from, to };
}

/**
 * Pure: rank in, tier out. The only place a tier is ever computed — rows, /me, the profile
 * header and snapshots all come through here, so the absolute → percentile switch happens
 * once. `totalRanked` is unused in ABSOLUTE mode but part of the contract from day one.
 */
export function tierForRank(rank: number, totalRanked: number, rules: TierRules = TIER_RULES): TierResult {
  if (!Number.isInteger(rank) || rank < 1) throw new RangeError(`Rank must be a positive integer, got ${rank}`);
  if (!Number.isInteger(totalRanked) || totalRanked < 0) throw new RangeError(`totalRanked must be a non-negative integer, got ${totalRanked}`);

  const band = rules.bands.find((b) => rank >= b.from && (b.to === null || rank <= b.to));
  // The integrity test guarantees the bands cover 1..∞, so this only trips on a broken config.
  if (!band) throw new Error(`No tier band covers rank ${rank}`);
  return { tier: band.tier, label: band.label, name: TIER_NAMES[band.tier], from: band.from, to: band.to };
}

/** The bands cover every rank from 1 upward exactly once and the last one is open-ended. */
export function assertContiguousBands(bands: readonly TierBand[]): void {
  let expectedFrom = 1;
  bands.forEach((band, i) => {
    if (band.from !== expectedFrom) throw new Error(`Band ${band.label} starts at ${band.from}, expected ${expectedFrom}`);
    const isLast = i === bands.length - 1;
    if (isLast) {
      if (band.to !== null) throw new Error(`Last band ${band.label} must be open-ended`);
      return;
    }
    if (band.to === null || band.to < band.from) throw new Error(`Band ${band.label} has an invalid upper bound`);
    expectedFrom = band.to + 1;
  });
}
