import type { ParticipationKind, ProjectType, TrustLevel } from "../../generated/prisma/enums";

// Every number the scoring engine uses lives here and nowhere else. The single rule that
// ties them together is `points = round(maxPoints × evidenceFactor)`: an item declares how
// much it could be worth, and the evidence behind it decides what fraction is earned.
//
//   easy to fake             → small factor     (typed URL 0.20, description-only project 0.10)
//   linked to real identity  → medium factor    (OAuth-linked account 0.60)
//   independently verified   → factor 1.00      (agent, later phase)
//
// Values are illustrative v1. Bump RULES_VERSION whenever they change so stored scores can
// be told apart from fresh ones and recomputed.

// v2: item sections carry a `max` (sum of added items' maxima) so the UI can draw bars.
export const RULES_VERSION = 2;

/** Everyone starts here. Never changes, never earned. */
export const BASE_SCORE = 1000;

// --- Caps ---------------------------------------------------------------------------------

export const SOCIAL_LINKS_MAX = 4;
export const PROJECTS_MAX = 5;
export const PARTICIPATIONS_MAX = 5;
export const PROJECT_TECHNOLOGIES_MAX = 10;

// --- Task 1: basic profile ----------------------------------------------------------------

export const BASIC_PROFILE = {
  avatar: { points: 20 },
  headline: { minLength: 10, points: 30 },
  /** Ascending tiers: the longest threshold met wins. The first tier is also the placement minimum. */
  bio: { tiers: [
    { minLength: 40, points: 20 },
    { minLength: 150, points: 45 },
    { minLength: 300, points: 70 },
  ] },
  location: { points: 15 },
  website: { points: 15 },
  yearsOfExperience: { points: 10 },
  /** From the onboarding questionnaire. */
  stack: { minTags: 3, points: 25 },
  categories: { points: 15 },
} as const;

export const BASIC_PROFILE_MAX =
  BASIC_PROFILE.avatar.points +
  BASIC_PROFILE.headline.points +
  BASIC_PROFILE.bio.tiers[BASIC_PROFILE.bio.tiers.length - 1]!.points +
  BASIC_PROFILE.location.points +
  BASIC_PROFILE.website.points +
  BASIC_PROFILE.yearsOfExperience.points +
  BASIC_PROFILE.stack.points +
  BASIC_PROFILE.categories.points;

// --- Task 2: social / professional identity -----------------------------------------------
// Per-platform maxima live in src/shared/social-platforms.ts next to the URL rules.

export const TRUST_FACTOR: Record<TrustLevel, number> = {
  CLAIMED: 0.2,
  LINKED: 0.6,
  VERIFIED: 1,
};

// --- Task 3: projects ---------------------------------------------------------------------

export type ProjectEvidence = "DESCRIPTION_ONLY" | "ONE_LINK" | "REPO_AND_LIVE";

export const PROJECT = {
  maxPoints: 300,
  /** Below this a description is a title, not evidence of anything. Also the placement minimum. */
  minDescriptionLength: 40,
  evidenceFactor: {
    DESCRIPTION_ONLY: 0.1,
    ONE_LINK: 0.25,
    REPO_AND_LIVE: 0.35,
  } satisfies Record<ProjectEvidence, number>,
  /**
   * Hard ceiling on the fraction a project can ever reach. A private / org project cannot be
   * inspected, so its evidence can never count for more than an unverified public one.
   */
  typeCeiling: {
    PUBLIC: 1,
    PRIVATE: 0.25,
  } satisfies Record<ProjectType, number>,
} as const;

// --- Task 4: community / collaboration / participation (optional) -------------------------

export type ParticipationEvidence = "DESCRIPTION_ONLY" | "WITH_URL";

export const PARTICIPATION = {
  maxPoints: 100,
  evidenceFactor: {
    DESCRIPTION_ONLY: 0.1,
    WITH_URL: 0.3,
  } satisfies Record<ParticipationEvidence, number>,
} as const;

export const PARTICIPATION_KIND_LABEL: Record<ParticipationKind, string> = {
  HACKATHON: "Hackathon",
  OPEN_SOURCE: "Open source",
  COMMUNITY: "Community",
  EVENT: "Event",
  FREELANCE: "Freelance",
  COLLABORATION: "Collaboration",
  OTHER: "Other",
};

// --- Verification -------------------------------------------------------------------------

/** A subject can be re-submitted for verification this often. */
export const VERIFICATION_COOLDOWN_SEC = 24 * 60 * 60;
