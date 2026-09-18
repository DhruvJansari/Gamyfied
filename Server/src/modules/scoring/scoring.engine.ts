import { platformSpec } from "../../shared/social-platforms";
import {
  BASIC_PROFILE,
  BASIC_PROFILE_MAX,
  PARTICIPATION,
  PARTICIPATION_KIND_LABEL,
  PROJECT,
  RULES_VERSION,
  TRUST_FACTOR,
  type ParticipationEvidence,
  type ProjectEvidence,
} from "./scoring.config";
import type {
  ProfileSnapshot,
  ScoreBreakdown,
  ScoreItem,
  ScoreSection,
  SnapshotParticipation,
  SnapshotProject,
  SnapshotSocialLink,
} from "./scoring.types";

// Pure: snapshot in, breakdown out. No I/O, no dates, no randomness. Calling it twice with
// the same snapshot must give the same answer — that is the whole anti-gaming story for the
// profile score (add → remove → add earns nothing).

const earned = (max: number, factor: number) => Math.round(max * factor);
const len = (s: string | null | undefined) => (s ?? "").trim().length;
const sum = (items: { points: number }[]) => items.reduce((acc, i) => acc + i.points, 0);
/** For item-based sections the ceiling is "what everything you've added could be worth"; absent when empty. */
const sumMax = (items: ScoreItem[]) => (items.length ? items.reduce((acc, i) => acc + i.max, 0) : undefined);

/** Verification points can top an item up, but never past its ceiling. */
function capVerification(evidencePoints: number, verificationPoints: number, ceiling: number): number {
  return Math.max(0, Math.min(verificationPoints, ceiling - evidencePoints));
}

// --- Task 1 -------------------------------------------------------------------------------

function basicProfile(s: ProfileSnapshot): ScoreSection {
  const p = s.profile;
  const items: ScoreItem[] = [];

  items.push({
    key: "avatar", label: "Avatar", max: BASIC_PROFILE.avatar.points,
    points: p.avatarUrl ? BASIC_PROFILE.avatar.points : 0,
    hint: p.avatarUrl ? undefined : "Add a profile photo",
  });

  const headlineOk = len(p.headline) >= BASIC_PROFILE.headline.minLength;
  items.push({
    key: "headline", label: "Headline", max: BASIC_PROFILE.headline.points,
    points: headlineOk ? BASIC_PROFILE.headline.points : 0,
    hint: headlineOk ? undefined : `Write a headline of at least ${BASIC_PROFILE.headline.minLength} characters`,
  });

  const bioLen = len(p.bio);
  const tiers = BASIC_PROFILE.bio.tiers;
  const bioTier = [...tiers].reverse().find((t) => bioLen >= t.minLength);
  const nextTier = tiers.find((t) => bioLen < t.minLength);
  items.push({
    key: "bio", label: "Bio", max: tiers[tiers.length - 1]!.points,
    points: bioTier?.points ?? 0,
    hint: nextTier ? `Write ${nextTier.minLength}+ characters for ${nextTier.points} points` : undefined,
  });

  items.push({
    key: "location", label: "Location", max: BASIC_PROFILE.location.points,
    points: len(p.location) > 0 ? BASIC_PROFILE.location.points : 0,
    hint: len(p.location) > 0 ? undefined : "Add where you are based",
  });
  items.push({
    key: "website", label: "Personal website", max: BASIC_PROFILE.website.points,
    points: p.websiteUrl ? BASIC_PROFILE.website.points : 0,
    hint: p.websiteUrl ? undefined : "Link your personal site",
  });
  items.push({
    key: "yearsOfExperience", label: "Experience", max: BASIC_PROFILE.yearsOfExperience.points,
    points: p.yearsOfExperience !== null ? BASIC_PROFILE.yearsOfExperience.points : 0,
    hint: p.yearsOfExperience !== null ? undefined : "Add your years of experience",
  });

  const stackCount = s.onboarding?.stack.length ?? 0;
  items.push({
    key: "stack", label: "Tech stack", max: BASIC_PROFILE.stack.points,
    points: stackCount >= BASIC_PROFILE.stack.minTags ? BASIC_PROFILE.stack.points : 0,
    hint: stackCount >= BASIC_PROFILE.stack.minTags ? undefined : `List at least ${BASIC_PROFILE.stack.minTags} technologies`,
  });
  const categoryCount = s.onboarding?.categories.length ?? 0;
  items.push({
    key: "categories", label: "Ranking categories", max: BASIC_PROFILE.categories.points,
    points: categoryCount > 0 ? BASIC_PROFILE.categories.points : 0,
    hint: categoryCount > 0 ? undefined : "Pick a category to be ranked in",
  });

  return { key: "BASIC_PROFILE", label: "Basic profile", points: sum(items), max: BASIC_PROFILE_MAX, items };
}

// --- Task 2 -------------------------------------------------------------------------------

function socialLinkItem(link: SnapshotSocialLink): ScoreItem {
  const spec = platformSpec(link.platform);
  const evidencePoints = earned(spec.maxPoints, TRUST_FACTOR[link.trustLevel]);
  const verificationPoints = capVerification(evidencePoints, link.verificationPoints, spec.maxPoints);

  let hint: string | undefined;
  if (link.trustLevel === "CLAIMED" && spec.linkable) {
    hint = `Sign in with ${spec.label} to raise this to ${earned(spec.maxPoints, TRUST_FACTOR.LINKED)}`;
  } else if (link.trustLevel !== "VERIFIED") {
    hint = "Verification coming soon";
  }

  return {
    key: link.platform, label: spec.label, max: spec.maxPoints,
    points: evidencePoints + verificationPoints,
    evidencePoints, verificationPoints, trustLevel: link.trustLevel, hint,
  };
}

function socialIdentity(s: ProfileSnapshot): ScoreSection {
  const items = s.socialLinks.map(socialLinkItem);
  return { key: "SOCIAL_IDENTITY", label: "Professional identity", points: sum(items), max: sumMax(items), items };
}

// --- Task 3 -------------------------------------------------------------------------------

export function projectEvidence(p: Pick<SnapshotProject, "repoUrl" | "liveUrl">): ProjectEvidence {
  if (p.repoUrl && p.liveUrl) return "REPO_AND_LIVE";
  if (p.repoUrl || p.liveUrl) return "ONE_LINK";
  return "DESCRIPTION_ONLY";
}

function projectItem(p: SnapshotProject): ScoreItem {
  const ceiling = earned(PROJECT.maxPoints, PROJECT.typeCeiling[p.projectType]);
  const evidence = projectEvidence(p);
  const hasDescription = len(p.description) >= PROJECT.minDescriptionLength;
  const factor = hasDescription ? Math.min(PROJECT.evidenceFactor[evidence], PROJECT.typeCeiling[p.projectType]) : 0;
  const evidencePoints = earned(PROJECT.maxPoints, factor);
  const verificationPoints = capVerification(evidencePoints, p.verificationPoints, ceiling);

  let hint: string | undefined;
  if (!hasDescription) hint = `Describe the project in at least ${PROJECT.minDescriptionLength} characters`;
  else if (p.projectType === "PRIVATE") hint = `Private projects are capped at ${ceiling} points`;
  else if (evidence === "DESCRIPTION_ONLY") hint = "Add a repository or live link";
  else if (evidence === "ONE_LINK") hint = "Add both a repository and a live link";
  else if (p.verificationStatus === "NOT_VERIFIED") hint = "Verify this project to unlock the rest";

  return {
    key: p.id, label: p.name, max: PROJECT.maxPoints,
    points: evidencePoints + verificationPoints,
    evidencePoints, verificationPoints, evidence, projectType: p.projectType,
    verificationStatus: p.verificationStatus, hint,
  };
}

function projects(s: ProfileSnapshot): ScoreSection {
  const items = s.projects.map(projectItem);
  return { key: "PROJECTS", label: "Projects", points: sum(items), max: sumMax(items), items };
}

// --- Task 4 (optional) --------------------------------------------------------------------

export function participationEvidence(p: Pick<SnapshotParticipation, "url">): ParticipationEvidence {
  return p.url ? "WITH_URL" : "DESCRIPTION_ONLY";
}

function participationItem(p: SnapshotParticipation): ScoreItem {
  const evidence = participationEvidence(p);
  const evidencePoints = earned(PARTICIPATION.maxPoints, PARTICIPATION.evidenceFactor[evidence]);
  const verificationPoints = capVerification(evidencePoints, p.verificationPoints, PARTICIPATION.maxPoints);
  return {
    key: p.id, label: `${PARTICIPATION_KIND_LABEL[p.kind]} · ${p.title}`, max: PARTICIPATION.maxPoints,
    points: evidencePoints + verificationPoints,
    evidencePoints, verificationPoints, evidence, kind: p.kind, verificationStatus: p.verificationStatus,
    hint: evidence === "DESCRIPTION_ONLY" ? "Add a link that shows your participation" : undefined,
  };
}

function participation(s: ProfileSnapshot): ScoreSection {
  const items = s.participations.map(participationItem);
  return { key: "PARTICIPATION", label: "Community & collaboration", points: sum(items), max: sumMax(items), optional: true, items };
}

// --- Entry point ---------------------------------------------------------------------------

export function computeProfileScore(snapshot: ProfileSnapshot): ScoreBreakdown {
  const sections = [basicProfile(snapshot), socialIdentity(snapshot), projects(snapshot), participation(snapshot)];
  return { rulesVersion: RULES_VERSION, total: sum(sections), sections };
}
