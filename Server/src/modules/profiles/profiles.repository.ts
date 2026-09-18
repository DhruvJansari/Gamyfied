import { prisma } from "../../config/db";
import type { Profile } from "../../generated/prisma/client";

export type { Profile };

export type UpdateProfileInput = {
  avatarUrl?: string | null;
  headline?: string | null;
  bio?: string | null;
  location?: string | null;
  websiteUrl?: string | null;
  yearsOfExperience?: number | null;
};

export const profilesRepository = {
  findByUserId(userId: string): Promise<Profile | null> {
    return prisma.profile.findUnique({ where: { userId } });
  },

  updateByUserId(userId: string, input: UpdateProfileInput): Promise<Profile> {
    return prisma.profile.update({ where: { userId }, data: input });
  },

  /** Fills the avatar from an OAuth provider only if the user has not set one themselves. */
  seedAvatar(userId: string, avatarUrl: string): Promise<number> {
    return prisma.profile.updateMany({ where: { userId, avatarUrl: null }, data: { avatarUrl } }).then((r) => r.count);
  },
};
