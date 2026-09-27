import { cached } from "../../lib/cache";
import { AppError } from "../../lib/errors";
import { DEFAULT_BOARD } from "../leaderboard/boards.config";
import { leaderboardService } from "../leaderboard/leaderboard.service";
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

type CachedOwner = Omit<OwnerProfileDto, "ranking">;
type CachedPublic = Omit<PublicProfileDto, "ranking">;

function ownerDto(r: Recomputed): CachedOwner {
  return toOwnerProfileDto(r.rows, r.profileScore, r.score, r.placement);
}

/**
 * Rank moves whenever anyone else's score does, so it is looked up on every read — one ZSET
 * call — rather than frozen into the five-minute cached view with the rest of the profile.
 */
async function withRanking<T extends CachedOwner | CachedPublic>(view: T, userId: string): Promise<T & { ranking: OwnerProfileDto["ranking"] }> {
  return { ...view, ranking: await leaderboardService.rankingOf(DEFAULT_BOARD, userId) };
}

export const profilesService = {
  /** Everything the /profile page needs in one call. */
  async getOwnerView(userId: string): Promise<OwnerProfileDto> {
    const view = await cached<CachedOwner>(ownerProfileKey(userId), PROFILE_CACHE_TTL_SEC, async () => {
      const rows = await loadProfileRows(userId);
      if (!rows) throw AppError.notFound("Profile not found");
      const [profileScore, score] = await Promise.all([scoringRepository.findComponent(userId, "PROFILE"), scoringRepository.findScore(userId)]);
      // No stored score yet (backfilled user) or one computed under older rules: rebuild it
      // now, so a rules retune rolls out lazily as people open their profile.
      if (!profileScore || !score || profileScore.rulesVersion !== RULES_VERSION) {
        return ownerDto(await scoringService.recomputeFromRows(rows));
      }
      return toOwnerProfileDto(rows, profileScore, score, evaluatePlacement(toSnapshot(rows)));
    });
    return withRanking(view, userId);
  },

  async getPublicView(handle: string): Promise<PublicProfileDto> {
    // The internal id rides along in the cache entry (never in the DTO) so the rank lookup on
    // a warm path needs no Postgres round trip.
    const { userId, view } = await cached<{ userId: string; view: CachedPublic }>(publicProfileKey(handle), PROFILE_CACHE_TTL_SEC, async () => {
      const user = await usersRepository.findByHandle(handle);
      const rows = user ? await loadProfileRows(user.id) : null;
      if (!user || !rows) throw AppError.notFound("No profile with that handle");
      const score = (await scoringRepository.findScore(user.id)) ?? (await scoringService.recomputeFromRows(rows)).score;
      return { userId: user.id, view: toPublicProfileDto(rows, score) };
    });
    return withRanking(view, userId);
  },

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<OwnerProfileDto> {
    await profilesRepository.updateByUserId(userId, input);
    return withRanking(ownerDto(await scoringService.recomputeProfileScore(userId)), userId);
  },

  /** OAuth sign-in: use the provider's picture unless the user already chose one. */
  async seedAvatar(userId: string, avatarUrl: string | null): Promise<void> {
    if (avatarUrl) await profilesRepository.seedAvatar(userId, avatarUrl);
  },
};
