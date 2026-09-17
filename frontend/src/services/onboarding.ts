import { request } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

// Mirrors Server/src/modules/onboarding. The enum values are the backend's; labels live in the UI.

export const ONBOARDING_GOALS = ["GET_HIRED", "BUILD_AUDIENCE", "COMPETE"] as const;
export type OnboardingGoal = (typeof ONBOARDING_GOALS)[number];

export const SKILL_CATEGORIES = [
  "WEB_DEV",
  "MOBILE_DEV",
  "AI_ML",
  "DSA_CP",
  "DEVOPS_CLOUD",
  "GAME_DEV",
  "CYBERSECURITY",
  "DATA_SCIENCE",
] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

export const STACK_MAX_ITEMS = 10;
export const STACK_TAG_MAX_LENGTH = 30;
export const CATEGORIES_MAX_ITEMS = 3;

export type Onboarding = {
  stack: string[];
  goal: OnboardingGoal;
  categories: SkillCategory[];
  completedAt: string;
};

export type SubmitOnboardingInput = Pick<Onboarding, "stack" | "goal" | "categories">;

export const onboardingService = {
  submitOnboarding(input: SubmitOnboardingInput): Promise<Onboarding> {
    return request({ method: "PUT", url: endpoints.onboarding.submit, data: input });
  },
};
