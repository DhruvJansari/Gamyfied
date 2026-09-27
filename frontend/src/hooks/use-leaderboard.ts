"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/api/query-keys";
import { leaderboardService, type BoardKey, type LeaderboardPage, type LeaderboardSearch, type MyRank, type TierLetter } from "@/services/leaderboard";

import { useMe } from "./use-auth";

// The board changes with every score write anywhere, so it is fresh for a short while only.
// The rest of the app uses a minute; here that would show a stale rank right after an edit.
const BOARD_STALE_MS = 30 * 1000;

/**
 * One page of a board, inside one tier when `tier` is set. `initialData` is the server-rendered
 * page, passed in by the route so the first paint needs no request; it only applies to that
 * one page key. Moving between pages or tiers keeps the previous rows on screen (dimmed by the
 * caller) until the next page lands.
 */
export function useLeaderboardPage(board: BoardKey, page: number, tier: TierLetter | null, initialData?: LeaderboardPage) {
  const seeds = initialData && initialData.page === page && initialData.tier === tier;
  return useQuery<LeaderboardPage>({
    queryKey: queryKeys.leaderboard.page(board, page, tier),
    queryFn: () => leaderboardService.getPage(board, page, tier),
    staleTime: BOARD_STALE_MS,
    placeholderData: keepPreviousData,
    ...(seeds ? { initialData } : {}),
  });
}

/** Name / handle / public-ID search over ranked users. Idle until there is something to search. */
export function useLeaderboardSearch(board: BoardKey, q: string) {
  return useQuery<LeaderboardSearch>({
    queryKey: queryKeys.leaderboard.search(board, q),
    queryFn: () => leaderboardService.search(board, q),
    staleTime: BOARD_STALE_MS,
    placeholderData: keepPreviousData,
    enabled: q.length > 0,
  });
}

/** The signed-in user's own standing. Never runs for a guest. */
export function useMyRank(board: BoardKey) {
  const me = useMe();
  return useQuery<MyRank>({
    queryKey: queryKeys.leaderboard.me(board),
    queryFn: () => leaderboardService.getMyRank(board),
    staleTime: BOARD_STALE_MS,
    enabled: !!me.data,
  });
}
