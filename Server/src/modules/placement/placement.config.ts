import { BASIC_PROFILE, PROJECT } from "../scoring/scoring.config";
import type { ProfileSnapshot } from "../scoring/scoring.types";

// Placement decides whether a user is eligible to be ranked; it awards no points. Four tasks,
// three required. Each is deliberately cheap to complete (the whole set should take well under
// thirty minutes) — how *well* it is done is the scoring engine's business, not placement's.
//
// Nothing here is persisted per task: progress is re-derived from the snapshot on every read,
// and only the moment of becoming ranked (`scores.ranked_at`) is stored.

export type PlacementTaskKey = "BASIC_PROFILE" | "SOCIAL_IDENTITY" | "PROJECTS" | "PARTICIPATION";

export type PlacementTask = {
  key: PlacementTaskKey;
  title: string;
  /** Required tasks gate ranking. Optional ones are shown, skippable, and never counted. */
  required: boolean;
  evaluate: (snapshot: ProfileSnapshot) => { done: boolean; hint: string };
};

const trimmedLength = (s: string | null) => (s ?? "").trim().length;

export const PLACEMENT_TASKS: readonly PlacementTask[] = [
  {
    key: "BASIC_PROFILE",
    title: "Complete your profile",
    required: true,
    evaluate: (s) => ({
      done:
        trimmedLength(s.profile.headline) >= BASIC_PROFILE.headline.minLength &&
        trimmedLength(s.profile.bio) >= BASIC_PROFILE.bio.tiers[0]!.minLength,
      hint: "Add a headline and a short bio",
    }),
  },
  {
    key: "SOCIAL_IDENTITY",
    title: "Add a professional profile",
    required: true,
    evaluate: (s) => ({
      done: s.socialLinks.length >= 1,
      hint: "Paste your GitHub, LinkedIn or LeetCode URL",
    }),
  },
  {
    key: "PROJECTS",
    title: "Add a project",
    required: true,
    evaluate: (s) => ({
      done: s.projects.some((p) => p.description.trim().length >= PROJECT.minDescriptionLength),
      hint: "One project with a short description is enough",
    }),
  },
  {
    key: "PARTICIPATION",
    title: "Community & collaboration",
    required: false,
    evaluate: (s) => ({
      done: s.participations.length >= 1,
      hint: "Hackathons, open source, events — or skip this",
    }),
  },
];
