"use client";

import Link from "next/link";

import { useMe } from "@/hooks/use-auth";
import type { PublicProfile } from "@/services/profiles";

import { HeroField } from "@/components/hero-field";
import { Avatar, PARTICIPATION_KIND_LABEL as KIND_LABEL, TrustChip, VerificationChip } from "@/components/profile-ui";
import { TierEmblem } from "@/components/tier-emblem";

/**
 * What a visitor sees. Server-rendered from props; the only client-side piece is the
 * "this is you" edit link, which needs the session.
 */
export function PublicProfileView({ profile }: { profile: PublicProfile }) {
  const me = useMe();
  const isOwner = me.data?.handle === profile.handle;
  const p = profile.profile;
  const memberSince = new Date(profile.memberSince).toLocaleDateString("en-US", { month: "short", year: "numeric" });

  const subtitle = [p.headline, p.location].filter(Boolean).join(" · ");

  return (
    <article className="flex flex-col gap-6">
      <header className="overflow-hidden rounded-lg border border-hairline bg-surface-soft">
        <HeroField />
        <div className="relative flex flex-col gap-5 px-5 pb-6 md:px-8">
          <div className="-mt-12 flex flex-col gap-4 md:-mt-14 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-5">
              <Avatar url={p.avatarUrl} name={profile.displayName} size="lg" />
              <div className="flex flex-col gap-0.5 pb-1">
                <h1 className="text-2xl md:text-3xl">{profile.displayName}</h1>
                {subtitle ? <p className="text-base text-body">{subtitle}</p> : null}
                <small className="font-mono text-muted">
                  @{profile.handle} · {profile.publicId}
                </small>
              </div>
            </div>
            {isOwner ? (
              <Link href="/profile" className="flex h-11 w-fit items-center rounded-pill border border-hairline bg-canvas px-5 text-ink no-underline active:bg-surface-strong">
                This is you. Edit profile
              </Link>
            ) : null}
          </div>
          <dl className="grid grid-cols-3 border-t border-hairline">
            <div className="flex flex-col gap-1 py-5 pr-4">
              <dt className="text-sm text-muted">Score</dt>
              <dd className="text-2xl tabular-nums tracking-tight text-ink md:text-3xl">{profile.score.total.toLocaleString()}</dd>
            </div>
            <div className="flex flex-col gap-1 border-l border-hairline px-4 py-5 md:px-6">
              <dt className="text-sm text-muted">Rank</dt>
              {/* Score, rank and tier are three numbers, kept apart (Context.md §4). */}
              {profile.ranking ? (
                <dd className="text-2xl tabular-nums tracking-tight text-ink md:text-3xl">
                  <Link href={`/leaderboard?page=${profile.ranking.page}`} className="flex items-center gap-2 text-ink no-underline">
                  <TierEmblem tier={profile.ranking.tier.tier} name={profile.ranking.tier.name} size="md" />
                    #{profile.ranking.rank.toLocaleString()}
                  </Link>
                </dd>
              ) : (
                <dd className="flex items-center gap-2 text-2xl text-ink md:text-3xl">
                  <span aria-hidden className="size-2.5 rounded-full bg-border-strong" />
                  Unranked
                </dd>
              )}
            </div>
            <div className="flex flex-col gap-1 border-l border-hairline px-4 py-5 md:px-6">
              <dt className="text-sm text-muted">Member since</dt>
              <dd className="text-2xl tracking-tight text-ink md:text-3xl">{memberSince}</dd>
            </div>
          </dl>
        </div>
      </header>

      {p.bio || profile.stack.length || p.websiteUrl || p.yearsOfExperience !== null ? (
        <section className="flex flex-col gap-4 rounded-lg border border-hairline bg-surface-soft p-5 md:p-8">
          <h2 className="text-xl md:text-2xl">About</h2>
          {p.bio ? <p className="whitespace-pre-line text-base">{p.bio}</p> : null}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {p.yearsOfExperience !== null ? <small className="text-muted">{p.yearsOfExperience} {p.yearsOfExperience === 1 ? "year" : "years"} of experience</small> : null}
            {p.websiteUrl ? (
              <a href={p.websiteUrl} target="_blank" rel="noreferrer" className="break-all">
                {p.websiteUrl}
              </a>
            ) : null}
          </div>
          {profile.stack.length ? (
            <div className="flex flex-wrap gap-2">
              {profile.stack.map((t) => (
                <small key={t} className="rounded-pill border border-hairline px-2.5 py-0.5 text-ink">
                  {t}
                </small>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {profile.socialLinks.length ? (
        <section className="flex flex-col gap-4 rounded-lg border border-hairline bg-surface-soft p-5 md:p-8">
          <h2 className="text-xl md:text-2xl">Profiles</h2>
          <ul className="flex flex-col divide-y divide-hairline">
            {profile.socialLinks.map((link) => (
              <li key={link.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="flex items-center gap-2 text-ink">
                  {link.label}
                  <TrustChip level={link.trustLevel} />
                </span>
                <a href={link.url} target="_blank" rel="noreferrer" className="truncate text-sm">
                  {link.url}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {profile.projects.length ? (
        <section className="flex flex-col gap-4 rounded-lg border border-hairline bg-surface-soft p-5 md:p-8">
          <h2 className="text-xl md:text-2xl">Projects</h2>
          <ul className="flex flex-col gap-3">
            {profile.projects.map((project) => (
              <li key={project.id} className="flex flex-col gap-3 rounded-md border border-hairline bg-canvas p-4">
                <h3 className="flex flex-wrap items-center gap-2 text-lg md:text-xl">
                  {project.name}
                  {project.projectType === "PRIVATE" ? <small className="rounded-pill border border-hairline px-2 text-muted">Private</small> : null}
                  <VerificationChip status={project.verificationStatus} />
                </h3>
                <p className="whitespace-pre-line text-base">{project.description}</p>
                {project.technologies.length ? (
                  <div className="flex flex-wrap gap-2">
                    {project.technologies.map((t) => (
                      <small key={t} className="rounded-pill border border-hairline px-2.5 py-0.5 text-ink">
                        {t}
                      </small>
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-4 text-sm">
                  {project.repoUrl ? (
                    <a href={project.repoUrl} target="_blank" rel="noreferrer">
                      Repository
                    </a>
                  ) : null}
                  {project.liveUrl ? (
                    <a href={project.liveUrl} target="_blank" rel="noreferrer">
                      Live
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {profile.participations.length ? (
        <section className="flex flex-col gap-4 rounded-lg border border-hairline bg-surface-soft p-5 md:p-8">
          <h2 className="text-xl md:text-2xl">Community & collaboration</h2>
          <ul className="flex flex-col divide-y divide-hairline">
            {profile.participations.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1 py-3">
                <span className="flex flex-wrap items-center gap-2 text-ink">
                  <small className="rounded-pill border border-hairline px-2 text-muted">{KIND_LABEL[entry.kind]}</small>
                  {entry.title}
                  {entry.year ? <small className="text-muted">{entry.year}</small> : null}
                  <VerificationChip status={entry.verificationStatus} />
                </span>
                {entry.note ? <p className="text-base">{entry.note}</p> : null}
                {entry.url ? (
                  <a href={entry.url} target="_blank" rel="noreferrer" className="truncate text-sm">
                    {entry.url}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
