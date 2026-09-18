import { describe, expect, it } from "vitest";

import type { ProfileSnapshot } from "../scoring/scoring.types";
import { evaluatePlacement } from "./placement.engine";

const empty = (): ProfileSnapshot => ({
  profile: { avatarUrl: null, headline: null, bio: null, location: null, websiteUrl: null, yearsOfExperience: null },
  onboarding: null,
  socialLinks: [],
  projects: [],
  participations: [],
});

const complete = (): ProfileSnapshot => ({
  ...empty(),
  profile: { ...empty().profile, headline: "Backend engineer", bio: "b".repeat(40) },
  socialLinks: [{ id: "l1", platform: "GITHUB", username: "o", url: "https://github.com/o", trustLevel: "CLAIMED", verificationPoints: 0 }],
  projects: [{ id: "p1", name: "X", description: "d".repeat(40), repoUrl: null, liveUrl: null, projectType: "PUBLIC", verificationStatus: "NOT_VERIFIED", verificationPoints: 0 }],
});

describe("evaluatePlacement", () => {
  it("starts unranked at 0/3 with four tasks, one optional", () => {
    const r = evaluatePlacement(empty());
    expect(r.requiredTotal).toBe(3);
    expect(r.requiredCompleted).toBe(0);
    expect(r.isRanked).toBe(false);
    expect(r.tasks).toHaveLength(4);
    expect(r.tasks.filter((t) => !t.required).map((t) => t.key)).toEqual(["PARTICIPATION"]);
    expect(r.tasks.every((t) => t.hint)).toBe(true);
  });

  it("ranks at 3/3 without touching the optional task", () => {
    const r = evaluatePlacement(complete());
    expect(r.requiredCompleted).toBe(3);
    expect(r.isRanked).toBe(true);
    expect(r.tasks.find((t) => t.key === "PARTICIPATION")?.done).toBe(false);
  });

  it("the optional task alone never changes ranking", () => {
    const s = empty();
    s.participations = [{ id: "c1", kind: "EVENT", title: "Meetup", url: null, verificationStatus: "NOT_VERIFIED", verificationPoints: 0 }];
    const r = evaluatePlacement(s);
    expect(r.isRanked).toBe(false);
    expect(r.requiredCompleted).toBe(0);
    expect(r.tasks.find((t) => t.key === "PARTICIPATION")?.done).toBe(true);
  });

  it("requires both headline and bio minimums for the basic profile task", () => {
    const s = complete();
    s.profile.bio = "short";
    expect(evaluatePlacement(s).tasks.find((t) => t.key === "BASIC_PROFILE")?.done).toBe(false);
    s.profile.bio = "b".repeat(40);
    s.profile.headline = "tiny";
    expect(evaluatePlacement(s).tasks.find((t) => t.key === "BASIC_PROFILE")?.done).toBe(false);
  });

  it("drops the hint once a task is done", () => {
    const r = evaluatePlacement(complete());
    expect(r.tasks.find((t) => t.key === "PROJECTS")?.hint).toBeUndefined();
  });
});
