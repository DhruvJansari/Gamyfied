import { redis } from "../../config/redis";
import { Prisma } from "../../generated/prisma/client";
import { AppError, ErrorCode } from "../../lib/errors";
import { onboardingRepository } from "../onboarding/onboarding.repository";
import { invalidateProfileCaches } from "../profiles/profiles.cache";
import { toMeDto, type MeDto } from "./users.dto";
import { usersRepository } from "./users.repository";
import type { UpdateMeInput } from "./users.schemas";

const ME_CACHE_TTL_SEC = 5 * 60;
const meKey = (userId: string) => `user:me:${userId}`;

export const usersService = {
  /** Cached in Redis so `/users/me` never hits Postgres on a warm path. Rebuildable: it is just the row. */
  async getMe(userId: string): Promise<MeDto> {
    const cached = await redis.get(meKey(userId));
    if (cached) return JSON.parse(cached) as MeDto;

    const [user, onboarding] = await Promise.all([usersRepository.findById(userId), onboardingRepository.findByUserId(userId)]);
    if (!user) throw AppError.unauthenticated();

    const dto = toMeDto(user, onboarding);
    await redis.set(meKey(userId), JSON.stringify(dto), "EX", ME_CACHE_TTL_SEC);
    return dto;
  },

  /** Call after any write to the user row or to anything the DTO includes (onboarding). */
  async invalidateMe(userId: string): Promise<void> {
    await redis.del(meKey(userId));
  },

  /** Display name and handle. The handle is the public URL, so both old and new views are dropped. */
  async updateMe(userId: string, input: UpdateMeInput): Promise<MeDto> {
    const before = await usersRepository.findById(userId);
    if (!before) throw AppError.unauthenticated();
    try {
      await usersRepository.updateIdentity(userId, input);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw AppError.conflict(ErrorCode.HANDLE_TAKEN, "That handle is already taken", { handle: "Already taken" });
      }
      throw err;
    }
    await Promise.all([
      this.invalidateMe(userId),
      invalidateProfileCaches(userId, before.handle),
      input.handle && input.handle !== before.handle ? invalidateProfileCaches(userId, input.handle) : Promise.resolve(),
    ]);
    return this.getMe(userId);
  },
};
