// Tier bands (Context.md §5.6) as data. A tier is a function of rank and nothing else: you do
// not earn it, you occupy it, and someone overtaking you pushes you down.
//
// S is absolute forever — twenty chairs — because scarcity is the point. A–E are absolute at
// launch and become percentile bands as the user base grows (open question 7). That switch is
// `mode` below plus one branch in tier.engine.ts; every caller already passes `totalRanked`.
//
// Bump TIER_RULES_VERSION whenever the bands change: rank_snapshots store it, so history can
// say "you went from B to C because the boundaries moved, not because you dropped".

export const TIER_RULES_VERSION = 1;

export type TierLetter = "S" | "A" | "B" | "C" | "D" | "E";

export const TIER_LETTERS = ["S", "A", "B", "C", "D", "E"] as const satisfies readonly TierLetter[];

/** The name shown beside the letter — the ladder's own ranks, in the spirit of a game's. */
export const TIER_NAMES: Record<TierLetter, string> = {
  S: "Legend",
  A: "Champion",
  B: "Vanguard",
  C: "Challenger",
  D: "Rookie",
  E: "Recruit",
};

export type TierBand = {
  tier: TierLetter;
  /** What the user sees: "S++", "A−", "C". */
  label: string;
  /** Inclusive 1-based rank bounds; `to: null` is open-ended (the last band). */
  from: number;
  to: number | null;
};

export type TierRules = {
  mode: "ABSOLUTE";
  bands: readonly TierBand[];
};

export const TIER_RULES: TierRules = {
  mode: "ABSOLUTE",
  bands: [
    { tier: "S", label: "S++", from: 1, to: 3 },
    { tier: "S", label: "S+", from: 4, to: 6 },
    { tier: "S", label: "S", from: 7, to: 10 },
    { tier: "S", label: "S−", from: 11, to: 20 },
    { tier: "A", label: "A+", from: 21, to: 60 },
    { tier: "A", label: "A", from: 61, to: 120 },
    { tier: "A", label: "A−", from: 121, to: 200 },
    { tier: "B", label: "B+", from: 201, to: 400 },
    { tier: "B", label: "B", from: 401, to: 700 },
    { tier: "B", label: "B−", from: 701, to: 1_000 },
    { tier: "C", label: "C", from: 1_001, to: 5_000 },
    { tier: "D", label: "D", from: 5_001, to: 20_000 },
    { tier: "E", label: "E", from: 20_001, to: null },
  ],
};
