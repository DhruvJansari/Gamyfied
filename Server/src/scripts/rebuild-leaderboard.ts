import "dotenv/config";

import { closePostgres, connectPostgres } from "../config/db";
import { closeRedis, connectRedis } from "../config/redis";
import { BOARD_KEYS } from "../modules/leaderboard/boards.config";
import { leaderboardService } from "../modules/leaderboard/leaderboard.service";

// `npm run lb:rebuild` — streams every board back out of Postgres. Safe to run any time; readers
// keep seeing the old board until the new one is swapped in.

async function main(): Promise<void> {
  await connectPostgres();
  await connectRedis();
  for (const board of BOARD_KEYS) {
    const count = await leaderboardService.rebuild(board);
    if (count === null) console.log(`[leaderboard] ${board}: another rebuild is in progress, skipped`);
  }
  await Promise.all([closePostgres(), closeRedis()]);
}

main().catch((err) => {
  console.error("[leaderboard] rebuild failed", err);
  process.exit(1);
});
