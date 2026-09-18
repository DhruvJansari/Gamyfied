import type { PlacementResult } from "../placement/placement.engine";
import { toParticipationDto, type ParticipationDto } from "../participations/participations.dto";
import { toProjectDto, type ProjectDto } from "../projects/projects.dto";
import type { ProfileScore, Score } from "../scoring/scoring.repository";
import type { ScoreBreakdown } from "../scoring/scoring.types";
import type { ProfileRows } from "../scoring/snapshot";
import { toSocialLinkDto, type SocialLinkDto } from "../social-links/social-links.dto";

// Two views of the same rows. The public one is what a stranger (or a recruiter) sees; the
// owner one adds placement, the score explanation and anything editable. Nothing from the
// account (email, phone, role) appears in either — that stays on /users/me.

export type ProfileFieldsDto = {
  avatarUrl: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  websiteUrl: string | null;
  yearsOfExperience: number | null;
};

export type ScoreSummaryDto = {
  base: number;
  profile: number;
  total: number;
  isRanked: boolean;
  rankedAt: string | null;
};

export type PublicProfileDto = {
  publicId: string;
  handle: string;
  displayName: string;
  memberSince: string;
  profile: ProfileFieldsDto;
  stack: string[];
  categories: string[];
  socialLinks: SocialLinkDto[];
  projects: ProjectDto[];
  participations: ParticipationDto[];
  score: Pick<ScoreSummaryDto, "total" | "isRanked">;
};

export type OwnerProfileDto = Omit<PublicProfileDto, "score"> & {
  score: ScoreSummaryDto;
  scoreBreakdown: ScoreBreakdown;
  placement: PlacementResult;
};

function fields(rows: ProfileRows): ProfileFieldsDto {
  const p = rows.profile;
  return {
    avatarUrl: p.avatarUrl,
    headline: p.headline,
    bio: p.bio,
    location: p.location,
    websiteUrl: p.websiteUrl,
    yearsOfExperience: p.yearsOfExperience,
  };
}

function shared(rows: ProfileRows): Omit<PublicProfileDto, "score"> {
  return {
    publicId: `#${rows.user.publicId}`,
    handle: rows.user.handle,
    displayName: rows.user.displayName,
    memberSince: rows.user.createdAt.toISOString(),
    profile: fields(rows),
    stack: rows.onboarding?.stack ?? [],
    categories: rows.onboarding?.categories ?? [],
    socialLinks: rows.socialLinks.map(toSocialLinkDto),
    projects: rows.projects.map(toProjectDto),
    participations: rows.participations.map(toParticipationDto),
  };
}

export function toPublicProfileDto(rows: ProfileRows, score: Score): PublicProfileDto {
  return { ...shared(rows), score: { total: score.total, isRanked: score.isRanked } };
}

export function toOwnerProfileDto(rows: ProfileRows, profileScore: ProfileScore, score: Score, placement: PlacementResult): OwnerProfileDto {
  return {
    ...shared(rows),
    score: {
      base: score.base,
      profile: profileScore.points,
      total: score.total,
      isRanked: score.isRanked,
      rankedAt: score.rankedAt?.toISOString() ?? null,
    },
    scoreBreakdown: profileScore.breakdown as ScoreBreakdown,
    placement,
  };
}
