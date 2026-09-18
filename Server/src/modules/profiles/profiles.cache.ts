import { redis } from "../../config/redis";

// Redis keys for the two profile views. Kept apart from the service so the scoring service
// can invalidate them after a recompute without importing the profiles service (which
// imports scoring — a cycle otherwise).

export const PROFILE_CACHE_TTL_SEC = 5 * 60;

export const ownerProfileKey = (userId: string) => `profile:owner:${userId}`;
export const publicProfileKey = (handle: string) => `profile:public:${handle.toLowerCase()}`;

export async function invalidateProfileCaches(userId: string, handle: string): Promise<void> {
  await redis.del(ownerProfileKey(userId), publicProfileKey(handle));
}
