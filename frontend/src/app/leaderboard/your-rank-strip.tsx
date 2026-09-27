"use client";

import Link from "next/link";
import { useState } from "react";

import { Avatar } from "@/components/profile-ui";
import { TierEmblem } from "@/components/tier-emblem";
import { useMe } from "@/hooks/use-auth";
import { useHydrated } from "@/hooks/use-hydrated";
import { useMyRank } from "@/hooks/use-leaderboard";
import { isApiError } from "@/lib/api/errors";
import { messageFor } from "@/lib/messages";
import type { BoardKey } from "@/services/leaderboard";

import { LeaderboardRow } from "./leaderboard-row";

/**
 * The viewer's own standing, docked to the bottom of the viewport while the board scrolls.
 * A guest is invited to sign in, an unranked user sees placement progress, a ranked user sees
 * tier, rank, movement and score with the rows around them one tap away. A secondary widget:
 * its own error, never the page's.
 */
export function YourRankStrip({ board, onGoToPage }: { board: BoardKey; onGoToPage: (page: number) => void }) {
  const hydrated = useHydrated();
  const me = useMe();
  const rank = useMyRank(board);
  const [open, setOpen] = useState(false);

  // The server always renders the skeleton (it has no session); the first client pass must too.
  if (!hydrated || me.isPending || (me.data && rank.isPending)) {
    return (
      <Dock>
        <div aria-hidden className="flex min-h-16 items-center gap-4 px-4 pb-4 pt-1">
          <span className="size-12 animate-pulse rounded-lg bg-surface-strong" />
          <span className="flex flex-col gap-2">
            <span className="h-4 w-40 animate-pulse rounded-sm bg-surface-strong" />
            <span className="h-3 w-28 animate-pulse rounded-sm bg-surface-strong" />
          </span>
          <span className="ml-auto h-6 w-16 animate-pulse rounded-sm bg-surface-strong" />
        </div>
      </Dock>
    );
  }

  if (!me.data) {
    return (
      <Dock>
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 pb-4 pt-1">
          <p className="text-base">Not on the board yet? Placement takes under thirty minutes.</p>
          <Link
            href="/sign-in?returnTo=/leaderboard"
            className="flex h-11 items-center rounded-pill bg-primary px-5 text-on-primary no-underline active:bg-primary-active"
          >
            Sign in to get ranked
          </Link>
        </div>
      </Dock>
    );
  }

  if (rank.isError || !rank.data) {
    return (
      <Dock>
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 pb-4 pt-1" role="status">
          <p className="text-base">{messageFor(isApiError(rank.error) ? rank.error.code : undefined)}</p>
          <button
            type="button"
            onClick={() => void rank.refetch()}
            className="h-11 rounded-pill border border-hairline bg-canvas px-4 text-ink active:bg-surface-strong"
          >
            Retry
          </button>
        </div>
      </Dock>
    );
  }

  const data = rank.data;

  if (data.status === "UNRANKED") {
    const { placement } = data;
    return (
      <Dock>
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-4 px-4 pb-4 pt-1">
          <div className="flex items-center gap-4">
            <span className="flex size-12 items-center justify-center rounded-lg border border-dashed border-border-strong text-muted">?</span>
            <span className="flex flex-col">
              <span className="text-ink">You&apos;re not ranked yet</span>
              <small className="text-muted">
                {placement.requiredCompleted} of {placement.requiredTotal} placement tasks done
              </small>
            </span>
          </div>
          <Link href="/profile" className="flex h-11 items-center rounded-pill bg-primary px-5 text-on-primary no-underline active:bg-primary-active">
            Finish placement →
          </Link>
        </div>
      </Dock>
    );
  }

  const delta = data.previous ? data.previous.rank - data.rank : 0;
  const since = data.previous
    ? new Date(data.previous.capturedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;
  const neighboursId = "your-rank-neighbours";
  // The neighbours include the user's own row, which carries the avatar the session does not.
  const own = data.neighbours.find((r) => r.data.rank === data.rank)?.data;

  return (
    <Dock highlighted onHandle={() => setOpen(!open)} expanded={open} handleControls={neighboursId}>
      {open ? (
        <ol id={neighboursId} className="divide-y divide-hairline border-b border-hairline">
          {data.neighbours.map((row) => (
            <LeaderboardRow key={row.data.handle} data={row.data} presentation={row.presentation} isYou={row.data.handle === me.data?.handle} />
          ))}
        </ol>
      ) : null}
      <div className="flex flex-col gap-3 px-4 pb-4 pt-2 md:flex-row md:items-center md:gap-6">
        <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-6">
          {/* Tier + rank: the two numbers that matter, side by side. */}
          <div className="flex shrink-0 items-center gap-3">
            <TierEmblem tier={data.tier.tier} name={data.tier.name} size="lg" />
            <span className="flex flex-col leading-none">
              <small className="text-muted">Your rank</small>
              <span className="text-2xl tabular-nums tracking-tight text-ink md:text-3xl">#{data.rank.toLocaleString()}</span>
            </span>
          </div>

          {/* Who, plus how it's moving. */}
          <div className="flex min-w-0 flex-1 items-center gap-3 md:border-l md:border-hairline md:pl-6">
            <Avatar url={own?.avatarUrl ?? null} name={me.data.displayName} size="sm" />
            <span className="flex min-w-0 flex-col">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-ink">{me.data.displayName}</span>
                <small className="shrink-0 rounded-pill bg-accent px-2 text-on-dark">You</small>
              </span>
              <small className="flex flex-wrap items-center gap-x-3 text-muted">
                <span>{data.tier.name}</span>
                <span>Top {data.topPercent}%</span>
                {delta !== 0 && since ? (
                  <span className={delta > 0 ? "text-success" : "text-warn"} title={`Rank ${data.previous!.rank} on ${since}`}>
                    {delta > 0 ? "▲" : "▼"} {Math.abs(delta)} since {since}
                  </span>
                ) : (
                  <span>of {data.totalRanked.toLocaleString()}</span>
                )}
              </small>
            </span>
          </div>
        </div>

        {/* Score, then the two actions. */}
        <div className="flex items-center justify-between gap-4 md:justify-end">
          <span className="flex items-center gap-4">
            <span className="flex flex-col items-end leading-none">
              <small className="text-muted">Score</small>
              <span className="text-xl tabular-nums text-ink md:text-2xl">{data.score.toLocaleString()}</span>
            </span>
          </span>
          <span className="flex gap-2">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={neighboursId}
              onClick={() => setOpen(!open)}
              className="h-10 rounded-pill border border-hairline bg-canvas px-4 text-sm text-ink active:bg-surface-strong"
            >
              {open ? "Hide" : "Around you"}
            </button>
            <button
              type="button"
              onClick={() => onGoToPage(data.page)}
              className="h-10 rounded-pill bg-primary px-4 text-sm text-on-primary active:bg-primary-active"
            >
              My page
            </button>
          </span>
        </div>
      </div>
    </Dock>
  );
}

/**
 * The docked frame: a bottom sheet. Rounded top corners against the screen edge, a grab handle
 * that reads as "there is more above me", and the same shape on every screen size. When the
 * handle has something to reveal (the ranked variant), it is a button and pulls the sheet up.
 */
function Dock({ highlighted = false, expanded = false, onHandle, handleControls, children }: {
  highlighted?: boolean;
  expanded?: boolean;
  onHandle?: () => void;
  handleControls?: string;
  children: React.ReactNode;
}) {
  const handle = <span aria-hidden className="block h-1.5 w-10 rounded-pill bg-border-strong" />;
  return (
    <div
      className={`sticky bottom-0 z-10 -mx-4 overflow-hidden rounded-t-xl border border-b-0 bg-canvas/95 shadow-[0_-10px_40px_-14px_rgba(0,0,0,0.35)] backdrop-blur md:mx-0 ${
        highlighted ? "border-accent/50" : "border-hairline"
      }`}
    >
      {onHandle ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={handleControls}
          aria-label={expanded ? "Hide the players around you" : "Show the players around you"}
          onClick={onHandle}
          className="flex w-full items-center justify-center py-2.5 active:bg-surface-strong"
        >
          {handle}
        </button>
      ) : (
        <div className="flex items-center justify-center py-2.5">{handle}</div>
      )}
      {children}
    </div>
  );
}
