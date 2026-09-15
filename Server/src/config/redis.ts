import Redis from "ioredis";

import { env } from "./env";

export const redis = new Redis(env.redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  connectTimeout: 5_000,
});

redis.on("error", (err) => {
  console.error("[redis] connection error", err.message);
});

export async function connectRedis(): Promise<void> {
  await redis.connect();
  const pong = await redis.ping();
  const info = await redis.info("server");
  const version = /redis_version:(\S+)/.exec(info)?.[1] ?? "unknown";
  console.log(`[redis] connected (${pong}, v${version})`);
}

export async function closeRedis(): Promise<void> {
  await redis.quit();
  console.log("[redis] connection closed");
}
