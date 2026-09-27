import { request } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { Ranking } from "./leaderboard";
import type { Participation, ParticipationKind } from "./participations";
import type { Project, ProjectType, VerificationStatus } from "./projects";
import type { SocialLink, TrustLevel } from "./social-links";

// Mirrors Server/src/modules/profiles (+ scoring / placement DTOs it embeds).

export type ProfileFields = {
  avatarUrl: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  websiteUrl: string | null;
  yearsOfExperience: number | null;
};

export type ScoreSectionKey = "BASIC_PROFILE" | "SOCIAL_IDENTITY" | "PROJECTS" | "PARTICIPATION";

export type ScoreItem = {
  key: string;
  label: string;
  points: number;
  max: number;
  hint?: string;
  evidencePoints?: number;
  verificationPoints?: number;
  trustLevel?: TrustLevel;
  evidence?: string;
  projectType?: ProjectType;
  kind?: ParticipationKind;
  verificationStatus?: VerificationStatus;
};

export type ScoreSection = {
  key: ScoreSectionKey;
  label: string;
  points: number;
  max?: number;
  optional?: boolean;
  items: ScoreItem[];
};

export type ScoreBreakdown = { rulesVersion: number; total: number; sections: ScoreSection[] };

export type PlacementTaskKey = ScoreSectionKey;

export type PlacementTask = {
  key: PlacementTaskKey;
  title: string;
  required: boolean;
  done: boolean;
  hint?: string;
};

export type Placement = {
  requiredCompleted: number;
  requiredTotal: number;
  isRanked: boolean;
  tasks: PlacementTask[];
};

type ProfileShared = {
  /** Permanent, e.g. "#7K2M9QX". */
  publicId: string;
  handle: string;
  displayName: string;
  memberSince: string;
  profile: ProfileFields;
  stack: string[];
  categories: string[];
  socialLinks: SocialLink[];
  projects: Project[];
  participations: Participation[];
  /** Score ≠ rank ≠ tier: this is the position, looked up fresh on every read. Null while unranked. */
  ranking: Ranking | null;
};

/** What anyone can see at /u/[handle]. */
export type PublicProfile = ProfileShared & {
  score: { total: number; isRanked: boolean };
};

/** What the owner sees at /profile. */
export type OwnerProfile = ProfileShared & {
  score: { base: number; profile: number; total: number; isRanked: boolean; rankedAt: string | null };
  scoreBreakdown: ScoreBreakdown;
  placement: Placement;
};

export type UpdateProfileInput = Partial<ProfileFields>;

export const profilesService = {
  getMyProfile(): Promise<OwnerProfile> {
    return request({ method: "GET", url: endpoints.profiles.me });
  },
  /** Returns the whole owner view so the page can update in one step. */
  updateMyProfile(input: UpdateProfileInput): Promise<OwnerProfile> {
    return request({ method: "PUT", url: endpoints.profiles.me, data: input });
  },
  getProfileByHandle(handle: string): Promise<PublicProfile> {
    return request({ method: "GET", url: endpoints.profiles.byHandle(handle) });
  },
};
