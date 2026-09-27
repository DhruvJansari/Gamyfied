import type { Score } from "../scoring/scoring.repository";
import { boardsForUser } from "./boards.config";
import { leaderboardIndex } from "./leaderboard.index";
import { rankSnapshotsRepository } from "./rank-snapshots.repository";
import { TIER_RULES_VERSION } from "./tier.config";
import { tierForRank } from "./tier.engine";

// The write-side hook. scoringService calls it once after every score write, in the same
// place it drops the profile caches, and nothing else touches the board on the write path.
// Imports no service, so there is no cycle with scoring.

export type ScoreChange = { totalChanged: boolean; becameRanked: boolean };

export const leaderboardSync = {
  /**
   * Puts the user's fresh score on every board they belong to and, when their position
   * actually moved (their total changed, or they just got placed), records a rank snapshot so
   * "why did my rank move" has something to answer from.
   *
   * Deliberate exception to "never swallow an error" (Project/Rules.md, Error handling): by the
   * time this runs the Postgres write has committed. Failing the request would tell the user
   * their save failed when it did not, and the board is recoverable from Postgres by
   * `leaderboardService.rebuild()`. So a Redis failure here is logged loudly and the request
   * completes — the same fail-open rule the rate limiter uses.
   */
  async afterScoreWrite(score: Score, change: ScoreChange, ctx: { categories: string[] }): Promise<void> {
    const boards = boardsForUser(ctx);
    try {
      await leaderboardIndex.syncUser(score.userId, score, boards);
      if (!score.isRanked || !(change.totalChanged || change.becameRanked)) return;

      const reason = change.becameRanked ? "PLACED" : "SCORE_CHANGE";
      await Promise.all(
        boards.map(async (board) => {
          const [rank, totalRanked] = await Promise.all([leaderboardIndex.rankOf(board, score.userId), leaderboardIndex.count(board)]);
          if (rank === null) return;
          const tier = tierForRank(rank, totalRanked);
          await rankSnapshotsRepository.create({
            boardKey: board, userId: score.userId, rank, tier: tier.label, tierRulesVersion: TIER_RULES_VERSION,
            score: score.total, totalRanked, reason,
          });
        }),
      );
    } catch (err) {
      console.error(`[leaderboard] sync failed for user ${score.userId}; run lb:rebuild if this persists`, err);
    }
  },
};
