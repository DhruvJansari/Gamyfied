"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useMe } from "@/hooks/use-auth";
import { useMyProfile } from "@/hooks/use-profile";
import { isApiError } from "@/lib/api/errors";
import { messageFor } from "@/lib/messages";

import { BoostCard } from "./boost-card";
import { OverviewTab, PHOTO_FIELD_ID } from "./overview-tab";
import { ParticipationsSection } from "./participations-section";
import { PlacementCard } from "./placement-card";
import { PROFILE_TABS, ProfileHeader, type ProfileTab } from "./profile-header";
import { ProjectsSection } from "./projects-section";
import { ScoreBreakdown } from "./score-breakdown";
import { SocialLinksSection } from "./social-links-section";

/**
 * The owner's profile. Header card with stats and tabs; the active tab lives in `?tab=` so
 * it can be linked to (project/Rules.md, State ownership). Score cards stay on the right.
 */
export function ProfilePage() {
  const me = useMe();
  const profile = useMyProfile();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const raw = params.get("tab");
  const tab: ProfileTab = (PROFILE_TABS as readonly string[]).includes(raw ?? "") ? (raw as ProfileTab) : "overview";
  function setTab(next: ProfileTab) {
    router.replace(next === "overview" ? pathname : `${pathname}?tab=${next}`, { scroll: false });
  }
  function editPhoto() {
    setTab("overview");
    // The field mounts on the next paint when switching tabs.
    requestAnimationFrame(() => document.getElementById(PHOTO_FIELD_ID)?.focus());
  }

  if (me.isPending || (me.data && profile.isPending)) return <ProfileSkeleton />;

  if (!me.data && !me.isError) {
    // proxy.ts redirects guests; this covers a session that vanished mid-flight.
    return (
      <div className="flex flex-col gap-4">
        <h1>You&apos;re signed out</h1>
        <p>
          <Link href="/sign-in?returnTo=/profile" className="text-ink underline underline-offset-4">
            Sign in
          </Link>{" "}
          to see your profile.
        </p>
      </div>
    );
  }

  const error = me.error ?? profile.error;
  if (error || !profile.data) {
    return (
      <div className="flex flex-col gap-4">
        <h1>Couldn&apos;t load your profile</h1>
        <p>{messageFor(isApiError(error) ? error.code : undefined)}</p>
        <button
          type="button"
          onClick={() => {
            void me.refetch();
            void profile.refetch();
          }}
          className="h-12 w-fit rounded-lg bg-primary px-6 text-on-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  const data = profile.data;
  return (
    <div className="flex flex-col gap-6">
      <ProfileHeader profile={data} tab={tab} onTab={setTab} onEditPhoto={editPhoto} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          {!data.placement.isRanked ? <PlacementCard placement={data.placement} onTab={setTab} /> : null}
          {tab === "overview" ? <OverviewTab profile={data} /> : null}
          {tab === "identity" ? <SocialLinksSection profile={data} /> : null}
          {tab === "projects" ? <ProjectsSection profile={data} /> : null}
          {tab === "community" ? <ParticipationsSection profile={data} /> : null}
        </div>
        <aside className="flex flex-col gap-6 lg:sticky lg:top-6">
          <ScoreBreakdown profile={data} />
          <BoostCard profile={data} onTab={setTab} />
        </aside>
      </div>
    </div>
  );
}

/** Mirrors the page: banner header with stats and tabs, then the two-column body. */
function ProfileSkeleton() {
  const bar = "animate-pulse rounded-sm bg-surface-strong";
  return (
    <div aria-busy className="flex flex-col gap-6">
      <div className="overflow-hidden rounded-lg border border-hairline bg-surface-soft">
        <div className="h-36 animate-pulse bg-surface-strong md:h-44" />
        <div className="flex flex-col gap-5 px-5 md:px-8">
          <div className="-mt-12 flex items-end gap-5 md:-mt-14">
            <div className="size-24 animate-pulse rounded-full border-4 border-surface-soft bg-surface-strong md:size-28" />
            <div className="flex flex-col gap-2 pb-2">
              <div className={`${bar} h-8 w-48`} />
              <div className={`${bar} h-4 w-56`} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 border-y border-hairline py-5 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className={`${bar} h-3 w-20`} />
                <div className={`${bar} h-8 w-24`} />
              </div>
            ))}
          </div>
          <div className="flex gap-6 pb-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`${bar} h-6 w-24`} />
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col rounded-lg border border-hairline bg-surface-soft px-5 md:px-8">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="grid gap-4 border-b border-hairline py-7 last:border-b-0 md:grid-cols-[15rem_1fr] md:gap-10">
              <div className="flex flex-col gap-2">
                <div className={`${bar} h-6 w-32`} />
                <div className={`${bar} h-4 w-44`} />
              </div>
              <div className={`${bar} h-12 w-full`} />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 rounded-lg border border-hairline bg-surface-soft p-6">
            <div className={`${bar} h-6 w-40`} />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`${bar} h-8 w-full`} />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-lg bg-surface-strong" />
        </div>
      </div>
    </div>
  );
}
