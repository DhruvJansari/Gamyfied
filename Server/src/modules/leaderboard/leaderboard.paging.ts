import { PAGE_SIZE, PODIUM_SIZE } from "./boards.config";

// Pure paging arithmetic. A page is always PAGE_SIZE consecutive ranks inside a scope: the
// whole board, or one tier's rank range (a tier filter is nothing more than a scope, which is
// why filtering never touches Postgres). Page n covers scope.from + (n−1)·PAGE_SIZE onward.

/** Inclusive 1-based rank range being paged. */
export type RankScope = { from: number; to: number };

export const WHOLE_BOARD: RankScope = { from: 1, to: Number.MAX_SAFE_INTEGER };

/** 0-based ZSET bounds (inclusive) for a 1-based page; `stop < start` means the page is empty. */
export function pageBounds(page: number, scope: RankScope = WHOLE_BOARD): { start: number; stop: number } {
  if (!Number.isInteger(page) || page < 1) throw new RangeError(`Page must be a positive integer, got ${page}`);
  const start = scope.from - 1 + (page - 1) * PAGE_SIZE;
  return { start, stop: Math.min(start + PAGE_SIZE - 1, scope.to - 1) };
}

/** How many pages a scope holds; never below 1 so the pager always has somewhere to stand. */
export function lastPageOf(scope: RankScope): number {
  return Math.max(1, Math.ceil(Math.max(0, scope.to - scope.from + 1) / PAGE_SIZE));
}

/** Which page of the whole board a rank appears on. */
export function pageOfRank(rank: number): number {
  return Math.ceil(rank / PAGE_SIZE);
}

/** Page 1 hands the first PODIUM_SIZE rows to the podium; every other page has none. Unfiltered pages only. */
export function splitPage<T>(rows: T[], page: number): { podium: T[]; rows: T[] } {
  if (page !== 1) return { podium: [], rows };
  return { podium: rows.slice(0, PODIUM_SIZE), rows: rows.slice(PODIUM_SIZE) };
}

/** "Top 12%": the share of the board at or above this rank, rounded up, never below 1. */
export function topPercent(rank: number, totalRanked: number): number {
  if (totalRanked < 1) return 100;
  return Math.max(1, Math.ceil((rank / totalRanked) * 100));
}
