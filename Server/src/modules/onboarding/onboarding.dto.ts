import type { Onboarding } from "./onboarding.repository";

/** The questionnaire answers as the API exposes them. Never the raw row. */
export type OnboardingDto = {
  stack: string[];
  goal: Onboarding["goal"];
  categories: Onboarding["categories"];
  completedAt: string;
};

export function toOnboardingDto(row: Onboarding): OnboardingDto {
  return {
    stack: row.stack,
    goal: row.goal,
    categories: row.categories,
    completedAt: row.completedAt.toISOString(),
  };
}
