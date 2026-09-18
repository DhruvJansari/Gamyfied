import type {
  ParticipationKind,
  ProjectType,
  SocialPlatform,
  TrustLevel,
  VerificationStatus,
} from "../../generated/prisma/enums";
import type { ParticipationEvidence, ProjectEvidence } from "./scoring.config";

// The snapshot is everything the scoring and placement engines need, loaded once per
// recompute (profiles/snapshot.ts). Both engines are pure functions of it — no I/O — which
// is what makes the score reproducible and testable.

export type SnapshotSocialLink = {
  id: string;
  platform: SocialPlatform;
  username: string;
  url: string;
  trustLevel: TrustLevel;
  /** From the latest completed verification of this link, 0 until the agent exists. */
  verificationPoints: number;
};

export type SnapshotProject = {
  id: string;
  name: string;
  description: string;
  repoUrl: string | null;
  liveUrl: string | null;
  projectType: ProjectType;
  verificationStatus: VerificationStatus;
  verificationPoints: number;
};

export type SnapshotParticipation = {
  id: string;
  kind: ParticipationKind;
  title: string;
  url: string | null;
  verificationStatus: VerificationStatus;
  verificationPoints: number;
};

export type ProfileSnapshot = {
  profile: {
    avatarUrl: string | null;
    headline: string | null;
    bio: string | null;
    location: string | null;
    websiteUrl: string | null;
    yearsOfExperience: number | null;
  };
  onboarding: { stack: string[]; categories: string[] } | null;
  socialLinks: SnapshotSocialLink[];
  projects: SnapshotProject[];
  participations: SnapshotParticipation[];
};

// --- Breakdown: what the user sees when they ask "why is my score X?" ----------------------

export type ScoreSectionKey = "BASIC_PROFILE" | "SOCIAL_IDENTITY" | "PROJECTS" | "PARTICIPATION";

export type ScoreItem = {
  key: string;
  label: string;
  points: number;
  max: number;
  /** The cheapest next action that would raise this item, if any. */
  hint?: string;
  /** Split of `points` for items that can be verified. */
  evidencePoints?: number;
  verificationPoints?: number;
  trustLevel?: TrustLevel;
  evidence?: ProjectEvidence | ParticipationEvidence;
  projectType?: ProjectType;
  kind?: ParticipationKind;
  verificationStatus?: VerificationStatus;
};

export type ScoreSection = {
  key: ScoreSectionKey;
  label: string;
  points: number;
  /** Basic profile: fixed. Item sections: the sum of the added items' maxima; omitted when empty. */
  max?: number;
  optional?: boolean;
  items: ScoreItem[];
};

export type ScoreBreakdown = {
  rulesVersion: number;
  total: number;
  sections: ScoreSection[];
};
