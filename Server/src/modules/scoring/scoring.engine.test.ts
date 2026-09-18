import { describe, expect, it } from "vitest";

import { BASIC_PROFILE_MAX, PARTICIPATION, PROJECT, TRUST_FACTOR } from "./scoring.config";
import { computeProfileScore } from "./scoring.engine";
import type { ProfileSnapshot, SnapshotParticipation, SnapshotProject, SnapshotSocialLink } from "./scoring.types";

const empty = (): ProfileSnapshot => ({
  profile: { avatarUrl: null, headline: null, bio: null, location: null, websiteUrl: null, yearsOfExperience: null },
  onboarding: null,
  socialLinks: [],
  projects: [],
  participations: [],
});

const link = (over: Partial<SnapshotSocialLink> = {}): SnapshotSocialLink => ({
  id: "l1", platform: "GITHUB", username: "octocat", url: "https://github.com/octocat",
  trustLevel: "CLAIMED", verificationPoints: 0, ...over,
});

const project = (over: Partial<SnapshotProject> = {}): SnapshotProject => ({
  id: "p1", name: "AI Assistant", description: "x".repeat(PROJECT.minDescriptionLength),
  repoUrl: null, liveUrl: null, projectType: "PUBLIC", verificationStatus: "NOT_VERIFIED", verificationPoints: 0, ...over,
});

const participation = (over: Partial<SnapshotParticipation> = {}): SnapshotParticipation => ({
  id: "c1", kind: "HACKATHON", title: "HackMIT", url: null, verificationStatus: "NOT_VERIFIED", verificationPoints: 0, ...over,
});

const section = (s: ProfileSnapshot, key: string) => computeProfileScore(s).sections.find((x) => x.key === key)!;

describe("computeProfileScore", () => {
  it("scores an empty profile at zero with four sections", () => {
    const result = computeProfileScore(empty());
    expect(result.total).toBe(0);
    expect(result.sections.map((s) => s.key)).toEqual(["BASIC_PROFILE", "SOCIAL_IDENTITY", "PROJECTS", "PARTICIPATION"]);
    expect(result.sections.find((s) => s.key === "PARTICIPATION")?.optional).toBe(true);
  });

  it("is a pure function of the snapshot (add → remove → add earns nothing extra)", () => {
    const before = computeProfileScore(empty()).total;
    const withProject = computeProfileScore({ ...empty(), projects: [project()] }).total;
    const removed = computeProfileScore(empty()).total;
    const again = computeProfileScore({ ...empty(), projects: [project({ id: "p2" })] }).total;
    expect(removed).toBe(before);
    expect(again).toBe(withProject);
  });

  describe("basic profile", () => {
    it("reaches the section maximum when everything is filled", () => {
      const s = empty();
      s.profile = {
        avatarUrl: "https://img", headline: "Backend engineer", bio: "b".repeat(300),
        location: "Pune", websiteUrl: "https://me.dev", yearsOfExperience: 4,
      };
      s.onboarding = { stack: ["ts", "node", "pg"], categories: ["WEB_DEV"] };
      const sec = section(s, "BASIC_PROFILE");
      expect(sec.points).toBe(BASIC_PROFILE_MAX);
      expect(sec.max).toBe(BASIC_PROFILE_MAX);
      expect(sec.items.every((i) => i.hint === undefined)).toBe(true);
    });

    it("awards bio points by tier and hints at the next tier", () => {
      const s = empty();
      s.profile.bio = "b".repeat(150);
      const bio = section(s, "BASIC_PROFILE").items.find((i) => i.key === "bio")!;
      expect(bio.points).toBe(45);
      expect(bio.hint).toContain("300+");
    });

    it("ignores whitespace-only text", () => {
      const s = empty();
      s.profile.headline = "               ";
      expect(section(s, "BASIC_PROFILE").items.find((i) => i.key === "headline")!.points).toBe(0);
    });
  });

  describe("social identity", () => {
    it("pays claimed < linked < verified on the same platform", () => {
      const at = (trustLevel: SnapshotSocialLink["trustLevel"]) =>
        section({ ...empty(), socialLinks: [link({ trustLevel })] }, "SOCIAL_IDENTITY").items[0]!.points;
      expect(at("CLAIMED")).toBe(200 * TRUST_FACTOR.CLAIMED);
      expect(at("LINKED")).toBe(200 * TRUST_FACTOR.LINKED);
      expect(at("VERIFIED")).toBe(200);
      expect(at("CLAIMED")).toBeLessThan(at("LINKED"));
      expect(at("LINKED")).toBeLessThan(at("VERIFIED"));
    });

    it("scores each platform independently", () => {
      const s = { ...empty(), socialLinks: [link(), link({ id: "l2", platform: "LINKEDIN", username: "jane" })] };
      const sec = section(s, "SOCIAL_IDENTITY");
      expect(sec.items).toHaveLength(2);
      expect(sec.points).toBe(40 + 30);
    });

    it("tells a claimed GitHub user to sign in, and caps verification at the platform max", () => {
      const claimed = section({ ...empty(), socialLinks: [link()] }, "SOCIAL_IDENTITY").items[0]!;
      expect(claimed.hint).toMatch(/Sign in with GitHub/);
      const over = section({ ...empty(), socialLinks: [link({ trustLevel: "LINKED", verificationPoints: 999 })] }, "SOCIAL_IDENTITY").items[0]!;
      expect(over.points).toBe(200);
      expect(over.verificationPoints).toBe(80);
    });
  });

  describe("projects", () => {
    const points = (p: SnapshotProject) => section({ ...empty(), projects: [p] }, "PROJECTS").items[0]!;

    it("follows the evidence ladder", () => {
      expect(points(project()).points).toBe(30);
      expect(points(project({ repoUrl: "https://github.com/a/b" })).points).toBe(75);
      expect(points(project({ liveUrl: "https://a.dev" })).points).toBe(75);
      expect(points(project({ repoUrl: "https://github.com/a/b", liveUrl: "https://a.dev" })).points).toBe(105);
    });

    it("caps private projects at the type ceiling, even with full evidence", () => {
      const item = points(project({ projectType: "PRIVATE", repoUrl: "https://github.com/a/b", liveUrl: "https://a.dev" }));
      expect(item.points).toBe(PROJECT.maxPoints * PROJECT.typeCeiling.PRIVATE);
      expect(item.hint).toMatch(/capped/);
      // Description-only private is still the description-only rate, not a double penalty.
      expect(points(project({ projectType: "PRIVATE" })).points).toBe(30);
    });

    it("gives nothing for a description shorter than the minimum", () => {
      expect(points(project({ description: "too short" })).points).toBe(0);
    });

    it("lets verification top a project up to, but not past, its ceiling", () => {
      const full = points(project({ repoUrl: "https://github.com/a/b", liveUrl: "https://a.dev", verificationStatus: "VERIFIED", verificationPoints: 500 }));
      expect(full.points).toBe(300);
      expect(full.verificationPoints).toBe(195);
      const priv = points(project({ projectType: "PRIVATE", verificationStatus: "VERIFIED", verificationPoints: 500 }));
      expect(priv.points).toBe(75);
    });

    it("counts every project the user has (the cap is enforced at write time)", () => {
      const s = { ...empty(), projects: [1, 2, 3, 4, 5].map((n) => project({ id: `p${n}` })) };
      expect(section(s, "PROJECTS").points).toBe(5 * 30);
    });
  });

  describe("participation (optional)", () => {
    it("never subtracts: skipping is exactly zero", () => {
      expect(section(empty(), "PARTICIPATION").points).toBe(0);
    });

    it("pays more with an evidence link", () => {
      const bare = section({ ...empty(), participations: [participation()] }, "PARTICIPATION").items[0]!;
      const linked = section({ ...empty(), participations: [participation({ url: "https://devpost.com/x" })] }, "PARTICIPATION").items[0]!;
      expect(bare.points).toBe(PARTICIPATION.maxPoints * PARTICIPATION.evidenceFactor.DESCRIPTION_ONLY);
      expect(linked.points).toBe(PARTICIPATION.maxPoints * PARTICIPATION.evidenceFactor.WITH_URL);
      expect(bare.hint).toBeDefined();
      expect(linked.hint).toBeUndefined();
    });
  });

  it("totals the sections", () => {
    const s: ProfileSnapshot = {
      ...empty(),
      socialLinks: [link({ trustLevel: "LINKED" })],
      projects: [project({ repoUrl: "https://github.com/a/b", liveUrl: "https://a.dev" })],
      participations: [participation({ url: "https://devpost.com/x" })],
    };
    s.profile.headline = "Backend engineer";
    const r = computeProfileScore(s);
    expect(r.total).toBe(30 + 120 + 105 + 30);
    expect(r.total).toBe(r.sections.reduce((a, x) => a + x.points, 0));
  });
});
