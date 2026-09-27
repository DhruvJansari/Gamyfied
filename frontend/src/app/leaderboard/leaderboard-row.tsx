import Link from "next/link";

import { Avatar } from "@/components/profile-ui";
import { TierEmblem } from "@/components/tier-emblem";
import type { LeaderboardRowData, LeaderboardRowPresentation } from "@/services/leaderboard";

import { RankEmblem } from "./rank-emblem";

// The renderer boundary for one row (Context.md §5.6). A row is two layers:
//
//   .lb-canvas   — user-owned. Empty today; later a user's approved card styles render here.
//                  It is its own containing block and stacking context (contain + isolation +
//                  overflow), so nothing inside it can escape the row or sit above the layer
//                  below, whatever CSS it carries.
//   .lb-platform — platform-owned. Rank, tier, score, handle and avatar are rendered here by
//                  us, a sibling of the canvas rather than a child, so user styles can neither
//                  match nor inherit into it.
//
// `presentation` is null until custom cards ship; then this switch grows a <CustomCard> branch
// and nothing above it changes.
//
// The division ("A+") is deliberately not shown anywhere on the frontend: the tier emblem is
// the whole story at a glance. It stays in the API and the database.

// Layout: rank · player · tier · (space) · score. The player cell grows only up to a cap, so
// the tier column sits right beside the names instead of at the far end of a stretched
// column; the empty flex spacer is what pushes the score to the edge. Shared with the header
// and the skeleton so the columns line up.
export const ROW_LAYOUT = "flex items-center gap-3 px-3 md:gap-4 md:px-6";
export const RANK_COL = "flex w-9 shrink-0 justify-center md:w-14";
// Player and Tier split the free width evenly (flex-1 = basis 0), so the Tier column starts at
// the same x on every row and the Player→Tier→Score spacing stays even at any viewport width.
export const PLAYER_COL = "flex min-w-0 flex-1 items-center gap-2 md:gap-3";
export const TIER_COL = "flex min-w-0 flex-1 items-center gap-2";
export const SCORE_COL = "w-16 shrink-0 text-right tabular-nums md:w-20";

export function LeaderboardRow({ data, presentation, isYou = false }: {
  data: LeaderboardRowData;
  presentation: LeaderboardRowPresentation;
  isYou?: boolean;
}) {
  // Only the default card exists today; the parameter is the seam.
  void presentation;
  return <DefaultCard data={data} isYou={isYou} />;
}

function DefaultCard({ data, isYou }: { data: LeaderboardRowData; isYou: boolean }) {
  return (
    <li className={`lb-row relative min-h-16 ${isYou ? "bg-accent-soft" : ""}`}>
      <div aria-hidden className="lb-canvas absolute inset-0 isolate overflow-hidden contain-[paint]" />
      <div className={`lb-platform relative min-h-16 ${ROW_LAYOUT}`}>
        <span className={RANK_COL}>
          <RankEmblem rank={data.rank} />
        </span>
        <span className={PLAYER_COL}>
          <Avatar url={data.avatarUrl} name={data.displayName} size="sm" />
          <span className="flex min-w-0 flex-col">
            <span className="flex min-w-0 items-center gap-2">
              <Link href={`/u/${data.handle}`} className="truncate text-ink no-underline">
                {data.displayName}
              </Link>
              {isYou ? <small className="shrink-0 rounded-pill bg-accent px-2 text-on-dark">You</small> : null}
            </span>
            <small className="truncate font-mono text-muted">@{data.handle}</small>
          </span>
        </span>
        <span className={TIER_COL}>
          <TierEmblem tier={data.tier.tier} name={data.tier.name} size="sm" className="md:hidden" />
          <TierEmblem tier={data.tier.tier} name={data.tier.name} size="md" className="hidden md:block" />
          <span className="hidden text-sm text-body md:inline">{data.tier.name}</span>
        </span>
        <span className={`${SCORE_COL} text-lg text-ink`}>{data.score.toLocaleString()}</span>
      </div>
    </li>
  );
}

/** Same box as DefaultCard, so nothing shifts when the rows arrive. */
export function RowSkeleton() {
  const bar = "animate-pulse rounded-sm bg-surface-strong";
  return (
    <li aria-hidden className={`min-h-16 ${ROW_LAYOUT}`}>
      <span className={RANK_COL}>
        <span className={`${bar} h-5 w-6`} />
      </span>
      <span className={PLAYER_COL}>
        <span className="size-10 shrink-0 animate-pulse rounded-full bg-surface-strong" />
        <span className="flex flex-col gap-1.5">
          <span className={`${bar} block h-4 w-36`} />
          <span className={`${bar} block h-3 w-24`} />
        </span>
      </span>
      <span className={TIER_COL}>
        <span className="size-7 animate-pulse rounded-lg bg-surface-strong md:size-9" />
        <span className={`${bar} hidden h-4 w-16 md:block`} />
      </span>
      <span className={`${SCORE_COL} flex justify-end`}>
        <span className={`${bar} h-4 w-14`} />
      </span>
    </li>
  );
}
