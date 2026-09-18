import { redis } from "../../config/redis";
import { AppError } from "../../lib/errors";
import { evaluatePlacement } from "../placement/placement.engine";
import { RULES_VERSION } from "../scoring/scoring.config";
import { scoringRepository } from "../scoring/scoring.repository";
import { scoringService, type Recomputed } from "../scoring/scoring.service";
import { loadProfileRows, toSnapshot } from "../scoring/snapshot";
import { usersRepository } from "../users/users.repository";
import { PROFILE_CACHE_TTL_SEC, ownerProfileKey, publicProfileKey } from "./profiles.cache";
import { toOwnerProfileDto, toPublicProfileDto, type OwnerProfileDto, type PublicProfileDto } from "./profiles.dto";
import { profilesRepository } from "./profiles.repository";
import type { UpdateProfileInput } from "./profiles.schemas";

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit) as T;
  const value = await load();
  await redis.set(key, JSON.stringify(value), "EX", PROFILE_CACHE_TTL_SEC);
  return value;
}

function ownerDto(r: Recomputed): OwnerProfileDto {
  return toOwnerProfileDto(r.rows, r.profileScore, r.score, r.placement);
}

export const profilesService = {
  /** Everything the /profile page needs in one call. */
  getOwnerView(userId: string): Promise<OwnerProfileDto> {
    return cached(ownerProfileKey(userId), async () => {
      const rows = await loadProfileRows(userId);
      if (!rows) throw AppError.notFound("Profile not found");
      const [profileScore, score] = await Promise.all([scoringRepository.findProfileScore(userId), scoringRepository.findScore(userId)]);
      // No stored score yet (backfilled user) or one computed under older rules: rebuild it
      // now, so a rules retune rolls out lazily as people open their profile.
      if (!profileScore || !score || profileScore.rulesVersion !== RULES_VERSION) {
        return ownerDto(await scoringService.recomputeFromRows(rows));
      }
      return toOwnerProfileDto(rows, profileScore, score, evaluatePlacement(toSnapshot(rows)));
    });
  },

  getPublicView(handle: string): Promise<PublicProfileDto> {
    return cached(publicProfileKey(handle), async () => {
      const user = await usersRepository.findByHandle(handle);
      const rows = user ? await loadProfileRows(user.id) : null;
      if (!user || !rows) throw AppError.notFound("No profile with that handle");
      const score = (await scoringRepository.findScore(user.id)) ?? (await scoringService.recomputeFromRows(rows)).score;
      return toPublicProfileDto(rows, score);
    });
  },

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<OwnerProfileDto> {
    await profilesRepository.updateByUserId(userId, input);
    return ownerDto(await scoringService.recomputeProfileScore(userId));
  },

  /** OAuth sign-in: use the provider's picture unless the user already chose one. */
  async seedAvatar(userId: string, avatarUrl: string | null): Promise<void> {
    if (avatarUrl) await profilesRepository.seedAvatar(userId, avatarUrl);
  },
};
