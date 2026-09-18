import { prisma } from "../../config/db";
import type { SocialLink } from "../../generated/prisma/client";
import type { SocialPlatform } from "../../generated/prisma/enums";

export type { SocialLink };

export type CreateClaimedLinkInput = {
  userId: string;
  platform: SocialPlatform;
  url: string;
  username: string;
};

export type UpsertLinkedLinkInput = CreateClaimedLinkInput & { accountId: string };

export const socialLinksRepository = {
  listByUserId(userId: string): Promise<SocialLink[]> {
    return prisma.socialLink.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  },

  findByIdForUser(id: string, userId: string): Promise<SocialLink | null> {
    return prisma.socialLink.findFirst({ where: { id, userId } });
  },

  findByUserAndPlatform(userId: string, platform: SocialPlatform): Promise<SocialLink | null> {
    return prisma.socialLink.findUnique({ where: { userId_platform: { userId, platform } } });
  },

  countByUserId(userId: string): Promise<number> {
    return prisma.socialLink.count({ where: { userId } });
  },

  createClaimed(input: CreateClaimedLinkInput): Promise<SocialLink> {
    return prisma.socialLink.create({ data: { ...input, trustLevel: "CLAIMED" } });
  },

  /** The authenticated identity replaces whatever the user typed for that platform. */
  upsertLinked(input: UpsertLinkedLinkInput): Promise<SocialLink> {
    const { userId, platform, ...rest } = input;
    return prisma.socialLink.upsert({
      where: { userId_platform: { userId, platform } },
      create: { userId, platform, ...rest, trustLevel: "LINKED" },
      update: { ...rest, trustLevel: "LINKED" },
    });
  },

  deleteById(id: string): Promise<void> {
    return prisma.socialLink.delete({ where: { id } }).then(() => undefined);
  },
};
