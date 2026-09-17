import { z } from "zod";

import { OnboardingGoal, SkillCategory } from "../../generated/prisma/enums";

export const STACK_MAX_ITEMS = 10;
export const CATEGORIES_MAX_ITEMS = 3;

const stackTagSchema = z.string().trim().min(1, "Empty tag").max(30, "At most 30 characters");

/** PUT /onboarding */
export const submitOnboardingSchema = z.object({
  stack: z
    .array(stackTagSchema)
    .min(1, "Add at least one technology")
    .max(STACK_MAX_ITEMS, `At most ${STACK_MAX_ITEMS} technologies`)
    // Dedupe case-insensitively, keeping the first spelling the user chose.
    .transform((tags) => {
      const seen = new Set<string>();
      return tags.filter((tag) => {
        const key = tag.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }),
  goal: z.enum(OnboardingGoal, { message: "Pick what you want from the platform" }),
  categories: z
    .array(z.enum(SkillCategory, { message: "Unknown category" }))
    .min(1, "Pick at least one category")
    .max(CATEGORIES_MAX_ITEMS, `At most ${CATEGORIES_MAX_ITEMS} categories`)
    .refine((list) => new Set(list).size === list.length, "Each category only once"),
});
export type SubmitOnboardingInput = z.infer<typeof submitOnboardingSchema>;
