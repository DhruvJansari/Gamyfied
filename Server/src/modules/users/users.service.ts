import { redis } from "../../config/redis";
import { AppError } from "../../lib/errors";
import { toMeDto, type MeDto } from "./users.dto";
import { usersRepository } from "./users.repository";

const ME_CACHE_TTL_SEC = 5 * 60;
const meKey = (userId: string) => `user:me:${userId}`;

export const usersService = {
  /** Cached in Redis so `/users/me` never hits Postgres on a warm path. Rebuildable: it is just the row. */
  async getMe(userId: string): Promise<MeDto> {
    const cached = await redis.get(meKey(userId));
    if (cached) return JSON.parse(cached) as MeDto;

    const user = await usersRepository.findById(userId);
    if (!user) throw AppError.unauthenticated();

    const dto = toMeDto(user);
    await redis.set(meKey(userId), JSON.stringify(dto), "EX", ME_CACHE_TTL_SEC);
    return dto;
  },

  /** Call after any write to the user row. */
  async invalidateMe(userId: string): Promise<void> {
    await redis.del(meKey(userId));
  },
};
