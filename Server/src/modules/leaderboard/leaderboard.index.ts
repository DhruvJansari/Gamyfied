import { redis } from "../../config/redis";
import { decodeTotal, encodeBoardScore } from "./board-score";
import { boardKeys, type BoardKey } from "./boards.config";

// The live board: one Redis sorted set per board key. This file is the only place ZSET
// commands exist. It imports no service, so scoringService can call it after a write without
// a cycle (the profiles.cache.ts pattern). Postgres `scores` is the source of truth; anything
// here is rebuilt from it by `rebuild()`.

export type BoardEntry = { userId: string; total: number };

export type RankedSource = { userId: string; total: number; totalChangedAt: Date };

const REBUILD_LOCK_SEC = 120;

export const leaderboardIndex = {
  /**
   * Puts a user on (or takes them off) every board they belong to, in one round trip, then
   * bumps each board's version so cached pages miss from now on.
   */
  async syncUser(userId: string, score: { total: number; totalChangedAt: Date; isRanked: boolean }, boards: BoardKey[]): Promise<void> {
    if (boards.length === 0) return;
    const pipeline = redis.pipeline();
    const now = new Date().toISOString();
    for (const board of boards) {
      if (score.isRanked) pipeline.zadd(boardKeys.zset(board), encodeBoardScore(score.total, score.totalChangedAt), userId);
      else pipeline.zrem(boardKeys.zset(board), userId);
      pipeline.incr(boardKeys.version(board));
      pipeline.set(boardKeys.updatedAt(board), now);
    }
    await pipeline.exec();
  },

  /** 1-based rank, or null when the user is not on the board. */
  async rankOf(board: BoardKey, userId: string): Promise<number | null> {
    const index = await redis.zrevrank(boardKeys.zset(board), userId);
    return index === null ? null : index + 1;
  },

  /** Rank and total for several users in one round trip; users not on the board are left out. */
  async entriesOf(board: BoardKey, userIds: string[]): Promise<(BoardEntry & { rank: number })[]> {
    if (userIds.length === 0) return [];
    const key = boardKeys.zset(board);
    const pipeline = redis.pipeline();
    for (const id of userIds) pipeline.zrevrank(key, id).zscore(key, id);
    const results = (await pipeline.exec()) ?? [];
    const entries: (BoardEntry & { rank: number })[] = [];
    userIds.forEach((userId, i) => {
      const index = results[i * 2]?.[1] as number | null;
      const score = results[i * 2 + 1]?.[1] as string | null;
      if (index === null || index === undefined || score === null || score === undefined) return;
      entries.push({ userId, rank: index + 1, total: decodeTotal(Number(score)) });
    });
    return entries;
  },

  count(board: BoardKey): Promise<number> {
    return redis.zcard(boardKeys.zset(board));
  },

  /** Entries for 0-based positions start..stop inclusive, best first, with their totals. */
  async range(board: BoardKey, start: number, stop: number): Promise<BoardEntry[]> {
    if (stop < start) return [];
    const flat = await redis.zrevrange(boardKeys.zset(board), start, stop, "WITHSCORES");
    const entries: BoardEntry[] = [];
    for (let i = 0; i < flat.length; i += 2) {
      entries.push({ userId: flat[i]!, total: decodeTotal(Number(flat[i + 1])) });
    }
    return entries;
  },

  async version(board: BoardKey): Promise<number> {
    return Number((await redis.get(boardKeys.version(board))) ?? 0);
  },

  async updatedAt(board: BoardKey): Promise<string | null> {
    return redis.get(boardKeys.updatedAt(board));
  },

  exists(board: BoardKey): Promise<boolean> {
    return redis.exists(boardKeys.zset(board)).then((n) => n === 1);
  },

  /**
   * Rebuilds a board from Postgres: streams the ranked rows into a temporary key and swaps it
   * over the live one atomically, so readers never see a half-built board. Guarded by a lock so
   * two processes (boot + a read that found the board empty) do not both do the work. Returns
   * the member count, or null if another rebuild held the lock.
   */
  async rebuild(board: BoardKey, source: AsyncIterable<RankedSource[]>): Promise<number | null> {
    const lock = boardKeys.rebuildLock(board);
    const acquired = await redis.set(lock, "1", "EX", REBUILD_LOCK_SEC, "NX");
    if (acquired !== "OK") return null;

    const temp = boardKeys.rebuildTemp(board);
    try {
      let count = 0;
      for await (const batch of source) {
        if (batch.length === 0) continue;
        const args: (string | number)[] = [];
        for (const row of batch) args.push(encodeBoardScore(row.total, row.totalChangedAt), row.userId);
        await redis.zadd(temp, ...args);
        count += batch.length;
      }
      if (count === 0) {
        // Nobody is ranked: an empty board is the absence of the key (RENAME needs a source),
        // and nothing changed, so the version stays and cached empty pages keep serving.
        await redis.del(boardKeys.zset(board));
        return 0;
      }
      await redis
        .pipeline()
        .rename(temp, boardKeys.zset(board))
        .incr(boardKeys.version(board))
        .set(boardKeys.updatedAt(board), new Date().toISOString())
        .exec();
      return count;
    } catch (err) {
      await redis.del(temp);
      throw err;
    } finally {
      await redis.del(lock);
    }
  },
};
