"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { FormError, FormField } from "@/components/form-field";
import { HeroField } from "@/components/hero-field";
import { Avatar, PrimaryButton, SecondaryButton } from "@/components/profile-ui";
import { TierEmblem } from "@/components/tier-emblem";
import { useUpdateMe } from "@/hooks/use-profile";
import { isApiError } from "@/lib/api/errors";
import { messageFor } from "@/lib/messages";
import { PARTICIPATIONS_MAX } from "@/services/participations";
import type { OwnerProfile } from "@/services/profiles";
import { PROJECTS_MAX } from "@/services/projects";
import { SOCIAL_LINKS_MAX } from "@/services/social-links";

export const PROFILE_TABS = ["overview", "identity", "projects", "community"] as const;
export type ProfileTab = (typeof PROFILE_TABS)[number];

export function ProfileHeader({ profile, tab, onTab, onEditPhoto }: {
  profile: OwnerProfile;
  tab: ProfileTab;
  onTab: (tab: ProfileTab) => void;
  onEditPhoto: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const { score, placement } = profile;
  const basic = profile.scoreBreakdown.sections.find((s) => s.key === "BASIC_PROFILE");
  const isLinked = profile.socialLinks.some((l) => l.trustLevel !== "CLAIMED");
  const subtitle = [profile.profile.headline, profile.profile.location].filter(Boolean).join(" · ");

  const tabs: { key: ProfileTab; label: string; count: string }[] = [
    { key: "overview", label: "Overview", count: `${basic?.points ?? 0}/${basic?.max ?? 0}` },
    { key: "identity", label: "Identity", count: `${profile.socialLinks.length}/${SOCIAL_LINKS_MAX}` },
    { key: "projects", label: "Projects", count: `${profile.projects.length}/${PROJECTS_MAX}` },
    { key: "community", label: "Community", count: `${profile.participations.length}/${PARTICIPATIONS_MAX}` },
  ];

  return (
    <header className="overflow-hidden rounded-lg border border-hairline bg-surface-soft">
      <HeroField />

      {/* relative: paints above the banner, which is positioned for its glow. */}
      <div className="relative flex flex-col gap-5 px-5 md:px-8">
        <div className="-mt-12 flex flex-col gap-4 md:-mt-14 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-5">
            <div className="relative w-fit">
              <Avatar url={profile.profile.avatarUrl} name={profile.displayName} size="lg" />
              <button
                type="button"
                onClick={onEditPhoto}
                aria-label="Change photo"
                className="absolute -right-1 bottom-1 flex size-9 items-center justify-center rounded-full border-2 border-surface-soft bg-primary text-on-primary active:bg-primary-active"
              >
                <PencilIcon />
              </button>
            </div>
            <div className="flex flex-col gap-0.5 pb-1">
              {editing ? (
                <IdentityForm profile={profile} onDone={() => setEditing(false)} />
              ) : (
                <>
                  <h1 className="flex items-center gap-2 text-2xl md:text-3xl">
                    {profile.displayName}
                    {isLinked ? (
                      <span title="Identity linked through sign-in" className="text-accent">
                        <BadgeIcon />
                      </span>
                    ) : null}
                  </h1>
                  {subtitle ? <p className="text-base text-body">{subtitle}</p> : <p className="text-base text-muted">Add a headline below</p>}
                  <small className="font-mono text-muted">
                    @{profile.handle} · {profile.publicId}
                  </small>
                </>
              )}
            </div>
          </div>

          {!editing ? (
            <div className="flex flex-wrap gap-3 pb-1">
              <SecondaryButton onClick={() => setEditing(true)} className="rounded-pill">
                Edit name & handle
              </SecondaryButton>
              <Link href={`/u/${profile.handle}`} className="flex h-11 items-center gap-1.5 rounded-pill bg-primary px-5 text-on-primary no-underline active:bg-primary-active">
                View public profile <span aria-hidden>↗</span>
              </Link>
            </div>
          ) : null}
        </div>

        <dl className="grid grid-cols-3 border-y border-hairline">
          <Stat label="Total score" value={score.total.toLocaleString()} />
          <Stat label="From profile" value={`+${score.profile}`} accent />
          {/* Score, rank and tier are three numbers, kept apart (Context.md §4). */}
          {profile.ranking ? (
            <Stat
              label="Rank"
              value={
                <Link href={`/leaderboard?page=${profile.ranking.page}`} className="flex items-center gap-2 text-ink no-underline">
                  <TierEmblem tier={profile.ranking.tier.tier} name={profile.ranking.tier.name} size="md" />
                  #{profile.ranking.rank.toLocaleString()}
                </Link>
              }
            />
          ) : (
            <Stat
              label="Rank"
              value={
                <span className="flex items-center gap-2">
                  <span aria-hidden className="size-2.5 rounded-full bg-border-strong" />
                  Unranked · {placement.requiredCompleted}/{placement.requiredTotal}
                </span>
              }
            />
          )}
        </dl>

        <nav aria-label="Profile sections" className="-mb-px flex gap-2 overflow-x-auto">
          {tabs.map((t) => {
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTab(t.key)}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-1 pb-3 pt-1 text-base ${active ? "border-ink text-ink" : "border-transparent text-muted"}`}
              >
                {t.label}
                <small className={`rounded-pill px-2 py-0.5 tabular-nums ${active ? "bg-surface-strong text-ink" : "bg-surface-strong/60 text-muted"}`}>{t.count}</small>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

function Stat({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1 border-l border-hairline px-4 py-5 first:border-l-0 first:pl-0 md:px-6">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`text-2xl tabular-nums tracking-tight md:text-3xl ${accent ? "text-accent" : "text-ink"}`}>{value}</dd>
    </div>
  );
}

function IdentityForm({ profile, onDone }: { profile: OwnerProfile; onDone: () => void }) {
  const update = useUpdateMe();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [handle, setHandle] = useState(profile.handle);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const input = {
      ...(displayName.trim() !== profile.displayName ? { displayName: displayName.trim() } : {}),
      ...(handle.trim().toLowerCase() !== profile.handle ? { handle: handle.trim().toLowerCase() } : {}),
    };
    if (Object.keys(input).length === 0) return onDone();
    update.mutate(input, { onSuccess: onDone });
  }

  const fields = isApiError(update.error) ? update.error.fields : {};
  const formError = update.error && !fields.displayName && !fields.handle ? messageFor(isApiError(update.error) ? update.error.code : undefined) : null;

  return (
    <form onSubmit={onSubmit} noValidate className="flex w-full max-w-md flex-col gap-4 pt-2">
      <FormField label="Name" name="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} error={fields.displayName} autoFocus />
      <FormField label="Handle" name="handle" hint="your public URL, /u/…" value={handle} onChange={(e) => setHandle(e.target.value)} maxLength={24} error={fields.handle} />
      <FormError message={formError} />
      <div className="flex gap-3">
        <PrimaryButton type="submit" disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save"}
        </PrimaryButton>
        <SecondaryButton onClick={onDone} disabled={update.isPending}>
          Cancel
        </SecondaryButton>
      </div>
    </form>
  );
}

function PencilIcon() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.5 2.5l2 2L5 13H3v-2z" />
    </svg>
  );
}

function BadgeIcon() {
  return (
    <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 1.9 3-.4 1.1 2.8 2.8 1.1-.4 3L23 12l-2.1 2.4.4 3-2.8 1.1-1.1 2.8-3-.4L12 22l-2.4-1.9-3 .4-1.1-2.8-2.8-1.1.4-3L1 12l2.1-2.4-.4-3 2.8-1.1 1.1-2.8 3 .4z" />
      <path d="M8.5 12.2l2.3 2.3 4.7-4.9" fill="none" stroke="var(--on-dark)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
