// How a user's score is laid out inside a Redis sorted-set score (an IEEE double, 53 exact
// integer bits). The high bits carry the total; the low bits carry the tie-break, so the ZSET
// order is a strict total order and tiers stay exact (S is twenty chairs, never twenty-three).
//
//   zscore = total × 2^TIE_BITS + (TIE_MAX − secondsSince(TIE_EPOCH, totalChangedAt))
//
// Tie-break rule: at equal totals, whoever reached that total first ranks higher — the usual
// ladder rule, legible in a tooltip, and derived from a Postgres column so a rebuild reproduces
// the same order. Same-second ties fall through to Redis' member order, which is stable.
//
// Budget: 22 bits for the total (up to 4,194,303 points) + 31 bits for the tie-break (68 years
// of seconds from the epoch below). 22 + 31 = 53: every value is exactly representable.

export const TOTAL_BITS = 22;
export const TIE_BITS = 31;
export const MAX_TOTAL = 2 ** TOTAL_BITS - 1;
const TIE_MAX = 2 ** TIE_BITS - 1;
const TIE_UNIT = 2 ** TIE_BITS;
/** Tie-break clock starts here; anything earlier counts as "reached first". */
export const TIE_EPOCH_MS = Date.UTC(2026, 0, 1);

export function encodeBoardScore(total: number, totalChangedAt: Date): number {
  if (!Number.isInteger(total) || total < 0 || total > MAX_TOTAL) {
    throw new RangeError(`Total ${total} is outside the encodable range 0..${MAX_TOTAL}`);
  }
  const seconds = Math.floor((totalChangedAt.getTime() - TIE_EPOCH_MS) / 1000);
  const tie = TIE_MAX - Math.min(TIE_MAX, Math.max(0, seconds));
  return total * TIE_UNIT + tie;
}

/** The total back out of a ZSET score, so paging never needs Postgres for the number. */
export function decodeTotal(zscore: number): number {
  return Math.floor(zscore / TIE_UNIT);
}
