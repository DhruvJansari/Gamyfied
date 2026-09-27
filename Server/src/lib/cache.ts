import { redis } from "../config/redis";

/**
 * Read-through JSON cache. The value is whatever `load` returns; callers own the key and the
 * TTL. Every cached view in the app is rebuildable from Postgres by construction — this only
 * ever memoises a load.
 */
export async function cached<T>(key: string, ttlSec: number, load: () => Promise<T>): Promise<T> {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit) as T;
  const value = await load();
  await redis.set(key, JSON.stringify(value), "EX", ttlSec);
  return value;
}
