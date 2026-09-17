import { prisma } from "../../config/db";
import type { Onboarding } from "../../generated/prisma/client";
import type { OnboardingGoal, SkillCategory } from "../../generated/prisma/enums";

export type { Onboarding };

export type UpsertOnboardingInput = {
  stack: string[];
  goal: OnboardingGoal;
  categories: SkillCategory[];
};

export const onboardingRepository = {
  findByUserId(userId: string): Promise<Onboarding | null> {
    return prisma.onboarding.findUnique({ where: { userId } });
  },

  /** One row per user; a second submit replaces the answers and refreshes `completedAt`. */
  upsertByUserId(userId: string, input: UpsertOnboardingInput): Promise<Onboarding> {
    return prisma.onboarding.upsert({
      where: { userId },
      create: { userId, ...input },
      update: { ...input, completedAt: new Date() },
    });
  },
};
