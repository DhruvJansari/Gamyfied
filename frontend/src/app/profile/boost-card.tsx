"use client";

import type { OwnerProfile, ScoreItem } from "@/services/profiles";

import type { ProfileTab } from "./profile-header";

// "What would move my score the most?" Derived from the breakdown the server sent: each
// item's headroom (max − points) with a one-line action, biggest first.

type Boost = { key: string; label: string; points: number; tab: ProfileTab };

const BASIC_ACTION: Record<string, string> = {
  avatar: "Add a photo",
  headline: "Write a headline",
  bio: "Finish your bio",
  location: "Add your location",
  website: "Link your website",
  yearsOfExperience: "Add your experience",
  stack: "List 3+ technologies",
  categories: "Pick ranking categories",
};

function headroom(item: ScoreItem): number {
  return Math.max(0, item.max - item.points);
}

export function boostsFor(profile: OwnerProfile): { boosts: Boost[]; total: number } {
  const boosts: Boost[] = [];
  let pendingActivities = 0;
  let activityPoints = 0;

  for (const section of profile.scoreBreakdown.sections) {
    for (const item of section.items) {
      const points = headroom(item);
      if (points === 0) continue;
      switch (section.key) {
        case "BASIC_PROFILE":
          boosts.push({ key: item.key, label: BASIC_ACTION[item.key] ?? item.label, points, tab: "overview" });
          break;
        case "SOCIAL_IDENTITY":
          boosts.push({
            key: item.key,
            label: item.trustLevel === "CLAIMED" && item.key === "GITHUB" ? "Connect GitHub" : `Verify ${item.label}`,
            points,
            tab: "identity",
          });
          break;
        case "PROJECTS":
          boosts.push({
            key: item.key,
            label: item.evidence === "REPO_AND_LIVE" ? `Verify ${item.label}` : `Add links to ${item.label}`,
            points,
            tab: "projects",
          });
          break;
        case "PARTICIPATION":
          pendingActivities += 1;
          activityPoints += points;
          break;
      }
    }
  }
  if (pendingActivities > 0) {
    boosts.push({
      key: "participations",
      label: pendingActivities === 1 ? "Verify 1 activity" : `Verify ${pendingActivities} activities`,
      points: activityPoints,
      tab: "community",
    });
  }
  boosts.sort((a, b) => b.points - a.points);
  return { boosts, total: boosts.reduce((acc, b) => acc + b.points, 0) };
}

export function BoostCard({ profile, onTab }: { profile: OwnerProfile; onTab: (tab: ProfileTab) => void }) {
  const { boosts, total } = boostsFor(profile);

  return (
    <section aria-labelledby="boost-title" className="flex flex-col gap-4 rounded-lg border border-on-dark/15 bg-surface-dark p-5 text-on-dark md:p-6">
      <header className="flex flex-col gap-1">
        <h2 id="boost-title" className="text-lg text-on-dark md:text-xl">
          Boost your score
        </h2>
        <small className="opacity-70">{total > 0 ? `Up to +${total} points waiting for you.` : "Everything you've added is at full points."}</small>
      </header>
      {boosts.length ? (
        <ul className="flex flex-col gap-2">
          {boosts.slice(0, 5).map((b) => (
            <li key={b.key}>
              <button
                type="button"
                onClick={() => onTab(b.tab)}
                className="flex w-full items-center justify-between gap-3 rounded-md border border-on-dark/10 bg-on-dark/5 px-4 py-3 text-left active:bg-on-dark/10"
              >
                <span className="truncate">{b.label}</span>
                <span className="shrink-0 tabular-nums text-accent">+{b.points}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <small className="opacity-70">Add another project or profile to unlock more.</small>
      )}
    </section>
  );
}
