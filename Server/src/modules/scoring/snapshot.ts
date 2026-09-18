import type { Onboarding, Participation, Profile, Project, SocialLink, User } from "../../generated/prisma/client";
import { onboardingRepository } from "../onboarding/onboarding.repository";
import { participationsRepository } from "../participations/participations.repository";
import { profilesRepository } from "../profiles/profiles.repository";
import { projectsRepository } from "../projects/projects.repository";
import { socialLinksRepository } from "../social-links/social-links.repository";
import { usersRepository } from "../users/users.repository";
import { verificationRepository } from "../verification/verification.repository";
import type { ProfileSnapshot } from "./scoring.types";

// The one loader. Everything that reads or recomputes a profile goes through here, so the
// owner view, the public view and the score are always built from the same rows.

export type ProfileRows = {
  user: User;
  profile: Profile;
  onboarding: Onboarding | null;
  socialLinks: SocialLink[];
  projects: Project[];
  participations: Participation[];
  /** subjectId → points from its latest counted verification. */
  verificationPoints: Map<string, number>;
};

export async function loadProfileRows(userId: string): Promise<ProfileRows | null> {
  const [user, profile, onboarding, socialLinks, projects, participations, verificationPoints] = await Promise.all([
    usersRepository.findById(userId),
    profilesRepository.findByUserId(userId),
    onboardingRepository.findByUserId(userId),
    socialLinksRepository.listByUserId(userId),
    projectsRepository.listByUserId(userId),
    participationsRepository.listByUserId(userId),
    verificationRepository.countedPointsByUser(userId),
  ]);
  // A user without a profile row would be one created before this phase and missed by the
  // backfill migration; treat it as not found rather than inventing an empty profile.
  if (!user || !profile) return null;
  return { user, profile, onboarding, socialLinks, projects, participations, verificationPoints };
}

/** Trims the rows down to exactly what the pure engines look at. */
export function toSnapshot(rows: ProfileRows): ProfileSnapshot {
  const points = (id: string) => rows.verificationPoints.get(id) ?? 0;
  return {
    profile: {
      avatarUrl: rows.profile.avatarUrl,
      headline: rows.profile.headline,
      bio: rows.profile.bio,
      location: rows.profile.location,
      websiteUrl: rows.profile.websiteUrl,
      yearsOfExperience: rows.profile.yearsOfExperience,
    },
    onboarding: rows.onboarding ? { stack: rows.onboarding.stack, categories: rows.onboarding.categories } : null,
    socialLinks: rows.socialLinks.map((l) => ({
      id: l.id, platform: l.platform, username: l.username, url: l.url, trustLevel: l.trustLevel, verificationPoints: points(l.id),
    })),
    projects: rows.projects.map((p) => ({
      id: p.id, name: p.name, description: p.description, repoUrl: p.repoUrl, liveUrl: p.liveUrl,
      projectType: p.projectType, verificationStatus: p.verificationStatus, verificationPoints: points(p.id),
    })),
    participations: rows.participations.map((c) => ({
      id: c.id, kind: c.kind, title: c.title, url: c.url, verificationStatus: c.verificationStatus, verificationPoints: points(c.id),
    })),
  };
}
