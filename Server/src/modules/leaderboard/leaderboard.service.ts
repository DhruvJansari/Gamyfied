import { cached } from "../../lib/cache";
import { AppError } from "../../lib/errors";
import { evaluatePlacement } from "../placement/placement.engine";
import { scoringRepository } from "../scoring/scoring.repository";
import { loadProfileRows, toSnapshot } from "../scoring/snapshot";
import { boardKeys, BOARDS, NEIGHBOUR_SPAN, PAGE_SIZE, type BoardKey } from "./boards.config";
import { toRowDto, toTierDto, type LeaderboardPageDto, type LeaderboardRowDto, type LeaderboardSearchDto, type MyRankDto, type RankingDto } from "./leaderboard.dto";
import { leaderboardIndex, type BoardEntry } from "./leaderboard.index";
import { lastPageOf, pageBounds, pageOfRank, splitPage, topPercent, type RankScope } from "./leaderboard.paging";
import { leaderboardRepository } from "./leaderboard.repository";
import { rankSnapshotsRepository } from "./rank-snapshots.repository";
import { TIER_RULES_VERSION, type TierLetter } from "./tier.config";
import { tierBounds, tierForRank } from "./tier.engine";

/**
 * Pages are cached under the board's version, which every write bumps, so a cached page is
 * never stale by more than one write and no invalidation list is needed. The TTL only bounds
 * memory. Page 1 under a read spike is rebuilt once per write, not once per read.
 */
const PAGE_CACHE_TTL_SEC = 30;
const REBUILD_BATCH = 1_000;
const SEARCH_LIMIT = 10;

async function toRows(entries: BoardEntry[], firstRank: number, totalRanked: number): Promise<LeaderboardRowDto[]> {
  const sources = await leaderboardRepository.findRowSourcesByUserIds(entries.map((e) => e.userId));
  return entries.flatMap((entry, i) => {
    const source = sources.get(entry.userId);
    // A member with no user row is a deleted account the board has not been rebuilt since.
    return source ? [toRowDto({ rank: firstRank + i, total: entry.total }, source, totalRanked)] : [];
  });
}

export const leaderboardService = {
  /**
   * One page of a board, optionally inside one tier. A tier is a rank range, so the filter is
   * plain ZSET paging — Postgres is only touched to hydrate the rows on the page.
   */
  async getPage(board: BoardKey, page: number, tier: TierLetter | null = null): Promise<LeaderboardPageDto> {
    const version = await leaderboardIndex.version(board);
    return cached(boardKeys.page(board, version, page, tier), PAGE_CACHE_TTL_SEC, async () => {
      let totalRanked = await leaderboardIndex.count(board);
      if (totalRanked === 0 && (await this.ensureBuilt(board))) totalRanked = await leaderboardIndex.count(board);

      // An unreached tier (nobody ranked that low yet) is an empty scope, not an error.
      const scope: RankScope = tier ? (tierBounds(tier, totalRanked) ?? { from: 1, to: 0 }) : { from: 1, to: totalRanked };
      const { start, stop } = pageBounds(page, scope);
      const [entries, updatedAt] = await Promise.all([leaderboardIndex.range(board, start, stop), leaderboardIndex.updatedAt(board)]);
      const all = await toRows(entries, start + 1, totalRanked);
      const { podium, rows } = tier ? { podium: [], rows: all } : splitPage(all, page);
      return { board, tier, page, pageSize: PAGE_SIZE, lastPage: lastPageOf(scope), totalRanked, updatedAt, podium, rows };
    });
  },

  /** Ranked users matching a name, handle or public ID, best rank first. Small and uncached. */
  async search(board: BoardKey, q: string): Promise<LeaderboardSearchDto> {
    const sources = await leaderboardRepository.searchRanked(q, SEARCH_LIMIT);
    const [entries, totalRanked] = await Promise.all([
      leaderboardIndex.entriesOf(board, sources.map((s) => s.userId)),
      leaderboardIndex.count(board),
    ]);
    const byId = new Map(sources.map((s) => [s.userId, s]));
    const rows = entries
      .sort((a, b) => a.rank - b.rank)
      .map((entry) => toRowDto({ rank: entry.rank, total: entry.total }, byId.get(entry.userId)!, totalRanked));
    return { board, q, rows };
  },

  /** Never cached: it is personal, and two ZSET lookups plus five row hydrations are cheap. */
  async getMyRank(board: BoardKey, userId: string): Promise<MyRankDto> {
    const [rank, totalRanked] = await Promise.all([leaderboardIndex.rankOf(board, userId), leaderboardIndex.count(board)]);
    if (rank === null) {
      const rows = await loadProfileRows(userId);
      if (!rows) throw AppError.notFound("Profile not found");
      return { board, status: "UNRANKED", placement: evaluatePlacement(toSnapshot(rows)) };
    }

    const start = Math.max(0, rank - 1 - NEIGHBOUR_SPAN);
    const stop = rank - 1 + NEIGHBOUR_SPAN;
    const [entries, previous] = await Promise.all([leaderboardIndex.range(board, start, stop), rankSnapshotsRepository.findPreviousByUser(userId, board)]);
    const neighbours = await toRows(entries, start + 1, totalRanked);
    const me = neighbours.find((r) => r.data.rank === rank);

    return {
      board,
      status: "RANKED",
      rank,
      tier: toTierDto(tierForRank(rank, totalRanked)),
      topPercent: topPercent(rank, totalRanked),
      score: me?.data.score ?? (await scoringRepository.findScore(userId))?.total ?? 0,
      totalRanked,
      page: pageOfRank(rank),
      previous: previous ? { rank: previous.rank, capturedAt: previous.capturedAt.toISOString() } : null,
      neighbours,
    };
  },

  /** Rank + tier for embedding in a profile view. Null when unranked. */
  async rankingOf(board: BoardKey, userId: string): Promise<RankingDto | null> {
    const [rank, totalRanked] = await Promise.all([leaderboardIndex.rankOf(board, userId), leaderboardIndex.count(board)]);
    if (rank === null) return null;
    return { board, rank, tier: toTierDto(tierForRank(rank, totalRanked)), totalRanked, page: pageOfRank(rank) };
  },

  /** Builds the board if Redis has lost it. Returns whether a rebuild ran. */
  async ensureBuilt(board: BoardKey): Promise<boolean> {
    if (await leaderboardIndex.exists(board)) return false;
    const count = await this.rebuild(board);
    return count !== null;
  },

  /**
   * Redis is never the source of truth (Project/Rules.md, Data): this streams `scores` back
   * into the board. Which rows a board holds is its membership rule — all ranked users for
   * the global board; per-category filters later.
   */
  async rebuild(board: BoardKey): Promise<number | null> {
    const membership = BOARDS[board].membership;
    const source = membership.kind === "ALL_RANKED" ? scoringRepository.iterateRanked(REBUILD_BATCH) : null;
    if (!source) throw new Error(`No rebuild source for board ${board}`);
    const count = await leaderboardIndex.rebuild(board, source);
    if (count !== null) console.log(`[leaderboard] ${board} rebuilt (${count} ranked)`);
    return count;
  },

  /** Every ranked user's position, in one sweep. For the scheduled history job (later phase). */
  async snapshotBoard(board: BoardKey): Promise<number> {
    const totalRanked = await leaderboardIndex.count(board);
    let written = 0;
    for (let start = 0; start < totalRanked; start += REBUILD_BATCH) {
      const entries = await leaderboardIndex.range(board, start, start + REBUILD_BATCH - 1);
      written += await rankSnapshotsRepository.createMany(
        entries.map((entry, i) => {
          const rank = start + i + 1;
          return {
            boardKey: board, userId: entry.userId, rank, tier: tierForRank(rank, totalRanked).label,
            tierRulesVersion: TIER_RULES_VERSION, score: entry.total, totalRanked, reason: "DAILY" as const,
          };
        }),
      );
    }
    return written;
  },
};
