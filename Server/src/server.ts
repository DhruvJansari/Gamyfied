import "dotenv/config";

import type { Server } from "node:http";

import { createApp } from "./app";
import { closePostgres, connectPostgres } from "./config/db";
import { env } from "./config/env";
import { closeRedis, connectRedis } from "./config/redis";
import { BOARD_KEYS } from "./modules/leaderboard/boards.config";
import { leaderboardService } from "./modules/leaderboard/leaderboard.service";

let server: Server | undefined;

async function main(): Promise<void> {
  await connectPostgres();
  await connectRedis();
  // Redis is rebuildable from Postgres, and this is where that promise is kept after a flush.
  for (const board of BOARD_KEYS) await leaderboardService.ensureBuilt(board);

  const app = createApp();
  server = app.listen(env.port, () => {
    console.log(`[server] listening on http://localhost:${env.port}`);
  });
}

async function shutdown(signal: string): Promise<void> {
  console.log(`[server] ${signal} received, closing`);

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((err) => (err ? reject(err) : resolve()));
      });
    }
    await Promise.all([closePostgres(), closeRedis()]);
    process.exit(0);
  } catch (err) {
    console.error("[server] error during shutdown", err);
    process.exit(1);
  }
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

main().catch((err) => {
  console.error("[server] failed to start", err);
  process.exit(1);
});
