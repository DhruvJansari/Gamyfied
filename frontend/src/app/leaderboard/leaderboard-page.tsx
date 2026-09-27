"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useMe } from "@/hooks/use-auth";
import { useHydrated } from "@/hooks/use-hydrated";
import { useLeaderboardPage, useLeaderboardSearch } from "@/hooks/use-leaderboard";
import { isApiError } from "@/lib/api/errors";
import { messageFor } from "@/lib/messages";
import { DEFAULT_BOARD, type LeaderboardPage, type LeaderboardRow as Row } from "@/services/leaderboard";

import { ChevronIcon, FilterRail } from "./filter-rail";
import { LeaderboardRow, PLAYER_COL, RANK_COL, ROW_LAYOUT, RowSkeleton, SCORE_COL, TIER_COL } from "./leaderboard-row";
import { boardSearch, parsePage, parseQuery, parseTier, type BoardLocation } from "./paging";
import { YourRankStrip } from "./your-rank-strip";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * The board. Page, tier and search text live in the URL (project/Rules.md, State ownership)
 * and change through the History API, so every move is a client fetch, not a server round
 * trip: the rows on screen stay, dimmed, until the next ones land.
 */
export function LeaderboardView({ initialPage }: { initialPage: LeaderboardPage | null }) {
  const board = DEFAULT_BOARD;
  const params = useSearchParams();
  const page = parsePage(params.get("page"));
  const tier = parseTier(params.get("tier"));
  const q = parseQuery(params.get("q"));

  const hydrated = useHydrated();
  const me = useMe();
  const pageQuery = useLeaderboardPage(board, page, tier, initialPage ?? undefined);
  const searchQuery = useLeaderboardSearch(board, q);
  // The "you" highlight is client knowledge; the server HTML never has it, so neither may the first client pass.
  const meHandle = hydrated ? me.data?.handle : undefined;

  function go(next: Partial<BoardLocation>) {
    window.history.pushState(null, "", window.location.pathname + boardSearch({ page, tier, q, ...next }));
    window.scrollTo({ top: 0 });
  }

  // Search as you type: the box is local state, the URL (and so the query) follows it after a
  // pause, and follows the URL back on browser navigation. The URL is the single source of truth.
  const [typed, setTyped] = useState(q);
  const written = useRef(q);
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = parseQuery(typed);
      if (next === written.current) return;
      written.current = next;
      window.history.replaceState(null, "", window.location.pathname + boardSearch({ page: 1, tier, q: next }));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [typed, tier]);
  useEffect(() => {
    if (q !== written.current) {
      written.current = q;
      setTyped(q);
    }
  }, [q]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1>Leaderboard</h1>
        <p className="max-w-3xl text-base">
          Preseason. Today the ladder ranks the evidence on your profile; when verification arrives it will check every claim and
          reshuffle every position.
        </p>
      </header>


      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="order-2 flex min-w-0 flex-col gap-4 lg:order-1">
          {q ? (
            <SearchResults q={q} rows={searchQuery.data?.rows} pending={searchQuery.isPending} dimmed={searchQuery.isPlaceholderData} error={searchQuery.error} onRetry={() => void searchQuery.refetch()} meHandle={meHandle} />
          ) : pageQuery.isPending ? (
            <BoardSkeleton />
          ) : pageQuery.isError || !pageQuery.data ? (
            <ErrorState title="Couldn't load the board" error={pageQuery.error} onRetry={() => void pageQuery.refetch()} />
          ) : (
            <Board data={pageQuery.data} page={page} dimmed={pageQuery.isPlaceholderData} meHandle={meHandle} onPage={(p) => go({ page: p })} />
          )}
          <YourRankStrip board={board} onGoToPage={(p) => go({ page: p, tier: null, q: "" })} />
        </div>
        <div className="order-1 lg:order-2">
          <FilterRail q={typed} onSearch={setTyped} tier={tier} onTier={(t) => go({ tier: t, page: 1 })} />
        </div>
      </div>
    </div>
  );
}

function Board({ data, page, dimmed, meHandle, onPage }: {
  data: LeaderboardPage;
  page: number;
  dimmed: boolean;
  meHandle?: string;
  onPage: (page: number) => void;
}) {
  const rows = [...data.podium, ...data.rows];

  if (data.totalRanked === 0) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-hairline bg-surface-soft p-8 text-center">
        <h2>Nobody is ranked yet</h2>
        <p className="text-muted">Finish placement on your profile and take the first chair.</p>
      </div>
    );
  }

  return (
    // aria-busy while a placeholder page is shown: the rows on screen belong to another page.
    <div aria-busy={dimmed} className={`flex flex-col gap-4 transition-opacity ${dimmed ? "opacity-60" : ""}`}>
      {rows.length === 0 ? (
        <div className="flex flex-col gap-3 rounded-lg border border-hairline bg-surface-soft p-8 text-center">
          <h2>{data.tier && page === 1 ? "Nobody here yet" : "Nothing this far down"}</h2>
          <p className="text-muted">{data.tier && page === 1 ? "No one has been ranked in this tier so far." : `The board ends on page ${data.lastPage}.`}</p>
          {page > 1 ? (
            <button type="button" onClick={() => onPage(data.lastPage)} className="mx-auto h-11 w-fit rounded-lg border border-hairline bg-canvas px-4 text-ink active:bg-surface-strong">
              Go to the last page
            </button>
          ) : null}
        </div>
      ) : (
        <Table>
          {rows.map((row) => (
            <LeaderboardRow key={row.data.handle} data={row.data} presentation={row.presentation} isYou={row.data.handle === meHandle} />
          ))}
        </Table>
      )}

      <nav aria-label="Pages" className="flex items-center justify-between gap-3">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="h-11 rounded-lg border border-hairline bg-canvas px-4 text-ink active:bg-surface-strong disabled:opacity-40">
          ‹ Previous
        </button>
        <small className="tabular-nums text-muted">Page {page}</small>
        <button type="button" disabled={page >= data.lastPage} onClick={() => onPage(page + 1)} className="h-11 rounded-lg border border-hairline bg-canvas px-4 text-ink active:bg-surface-strong disabled:opacity-40">
          Next ›
        </button>
      </nav>
    </div>
  );
}

function SearchResults({ q, rows, pending, dimmed, error, onRetry, meHandle }: {
  q: string;
  rows: Row[] | undefined;
  pending: boolean;
  dimmed: boolean;
  error: unknown;
  onRetry: () => void;
  meHandle?: string;
}) {
  if (pending) return <BoardSkeleton count={4} />;
  if (error || !rows) return <ErrorState title="Couldn't search the board" error={error} onRetry={onRetry} />;
  return (
    <div aria-busy={dimmed} className={`flex flex-col gap-4 transition-opacity ${dimmed ? "opacity-60" : ""}`}>
      <small className="text-muted" role="status">
        {rows.length === 0 ? `No ranked player matches “${q}”.` : `${rows.length === 10 ? "Top 10 matches" : `${rows.length} ${rows.length === 1 ? "match" : "matches"}`} for “${q}”`}
      </small>
      {rows.length ? (
        <Table>
          {rows.map((row) => (
            <LeaderboardRow key={row.data.handle} data={row.data} presentation={row.presentation} isYou={row.data.handle === meHandle} />
          ))}
        </Table>
      ) : null}
    </div>
  );
}

/** Column headings plus the rows: the one table on the page, used for the board and for search. */
function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-surface-soft">
      <BoardToolbar />
      <div aria-hidden className={`h-11 border-b border-hairline bg-page/60 text-sm text-muted ${ROW_LAYOUT}`}>
        <span className={RANK_COL}>Rank</span>
        <span className={PLAYER_COL}>Player</span>
        <span className={TIER_COL}>Tier</span>
        <span className={SCORE_COL}>Score</span>
      </div>
      <ol className="divide-y divide-hairline">{children}</ol>
    </div>
  );
}

/** Scope, then region — the strip a ranking screen puts above its table. */
const REGIONS = [
  { code: "IN", label: "India", live: true },
  { code: "GLOBAL", label: "Worldwide", live: false },
  { code: "US", label: "United States", live: false },
  { code: "EU", label: "Europe", live: false },
] as const;

function BoardToolbar() {
  const [scope, setScope] = useState<"server" | "friends">("server");
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-3 py-3 md:px-6">
      <div role="tablist" aria-label="Scope" className="flex rounded-pill border border-hairline bg-canvas p-1">
        <button
          type="button"
          role="tab"
          aria-selected={scope === "server"}
          onClick={() => setScope("server")}
          className={`h-9 rounded-pill px-4 text-sm ${scope === "server" ? "bg-primary text-on-primary" : "text-body"}`}
        >
          Server
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={scope === "friends"}
          aria-disabled
          disabled
          title="Friends are coming with clans"
          className="flex h-9 items-center gap-2 rounded-pill px-4 text-sm text-muted disabled:opacity-60"
        >
          Friends <small className="rounded-pill bg-surface-strong/60 px-2 text-muted">Soon</small>
        </button>
      </div>

      <label className="relative flex h-10 items-center gap-2 rounded-pill border border-hairline bg-canvas pl-4 pr-9 text-sm">
        <span className="text-muted">Region</span>
        <select
          aria-label="Region"
          defaultValue="IN"
          className="h-full appearance-none bg-transparent pr-1 text-ink focus:outline-none"
        >
          {REGIONS.map((r) => (
            <option key={r.code} value={r.code} disabled={!r.live}>
              {r.label}{r.live ? "" : " · soon"}
            </option>
          ))}
        </select>
        <ChevronIcon className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
      </label>
    </div>
  );
}

function ErrorState({ title, error, onRetry }: { title: string; error: unknown; onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <h2>{title}</h2>
      <p>{messageFor(isApiError(error) ? error.code : undefined)}</p>
      <button type="button" onClick={onRetry} className="h-12 w-fit rounded-lg bg-primary px-6 text-on-primary">
        Retry
      </button>
    </div>
  );
}

/** Mirrors Board: the table with a page of rows, then the pager. */
function BoardSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div aria-busy className="flex flex-col gap-4">
      <Table>
        {Array.from({ length: count }, (_, i) => (
          <RowSkeleton key={i} />
        ))}
      </Table>
      <div className="flex justify-between">
        <div className="h-11 w-28 animate-pulse rounded-lg bg-surface-strong" />
        <div className="h-11 w-20 animate-pulse rounded-lg bg-surface-strong" />
      </div>
    </div>
  );
}
