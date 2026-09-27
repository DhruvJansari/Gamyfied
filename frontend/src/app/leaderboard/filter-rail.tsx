"use client";

import { useEffect, useRef, useState } from "react";

import { TierEmblem } from "@/components/tier-emblem";
import { TIER_LETTERS, TIER_NAMES, TIER_RANKS, type TierLetter } from "@/services/leaderboard";

// The right rail, in the spirit of a game's ranking screen: search, the tier picker, then a
// list of every board with its rankings underneath. Only the global ranking is live today; the
// others keep their place in the list so the shape of the product is visible.

const BOARD_MENU = [
  {
    key: "ranking",
    label: "Ranking",
    items: [
      { key: "global", label: "Global ranking", live: true },
      { key: "category", label: "By skill category", live: false },
      { key: "season", label: "Season ranking", live: false },
    ],
  },
  {
    key: "popularity",
    label: "Popularity",
    items: [{ key: "popularity", label: "Profile visits", live: false }],
  },
  {
    key: "clans",
    label: "Clans",
    items: [
      { key: "clan-ranking", label: "Clan ranking", live: false },
      { key: "clan-battles", label: "Battle standings", live: false },
    ],
  },
] as const;

export function FilterRail({ q, onSearch, tier, onTier }: {
  q: string;
  onSearch: (q: string) => void;
  tier: TierLetter | null;
  onTier: (tier: TierLetter | null) => void;
}) {
  const [openGroup, setOpenGroup] = useState<string>("ranking");

  return (
    // The grid cell stretches to the row; the rail itself sticks while the table scrolls.
    <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
      <form role="search" onSubmit={(e) => e.preventDefault()} className="relative">
        <label htmlFor="lb-search" className="sr-only">
          Search players
        </label>
        <SearchIcon />
        <input
          id="lb-search"
          type="search"
          value={q}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search name or handle"
          autoComplete="off"
          maxLength={60}
          className="h-11 w-full rounded-sm border border-border-strong bg-canvas pl-10 pr-4 text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-info-border"
        />
      </form>

      <div className="flex flex-col gap-2 rounded-lg border border-hairline bg-surface-soft p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-ink">Tier</span>
          <small className="text-muted">{q ? "Off while searching" : "Filter the board"}</small>
        </div>
        <TierDropdown tier={tier} onTier={onTier} disabled={!!q} />
      </div>

      {/* Boards, grouped and collapsible; the active ranking is ticked. */}
      <nav aria-label="Boards" className="rounded-lg border border-hairline bg-surface-soft p-2">
        <ul className="flex flex-col">
          {BOARD_MENU.map((group) => {
            const open = openGroup === group.key;
            const live = group.items.some((i) => i.live);
            return (
              <li key={group.key} className="border-b border-hairline last:border-b-0">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenGroup(open ? "" : group.key)}
                  className="flex h-12 w-full items-center justify-between gap-3 rounded-md px-3 text-left active:bg-surface-strong"
                >
                  <span className="flex items-center gap-2 text-ink">
                    {group.label}
                    {!live ? <small className="rounded-pill bg-surface-strong/60 px-2 py-0.5 text-muted">Soon</small> : null}
                  </span>
                  <ChevronIcon className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
                {open ? (
                  <ul className="flex flex-col gap-0.5 pb-2">
                    {group.items.map((item) => (
                      <li key={item.key}>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={item.live}
                          disabled={!item.live}
                          className={`flex h-10 w-full items-center justify-between rounded-md pl-6 pr-3 text-left text-sm ${
                            item.live ? "bg-surface-strong text-ink" : "text-muted disabled:opacity-60"
                          }`}
                        >
                          {item.label}
                          {item.live ? <span aria-hidden>✓</span> : <small className="text-muted">Soon</small>}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

/**
 * The tier picker. A native <select> cannot draw the emblems, and the emblem is how a tier is
 * recognised, so this is a button that opens a listbox: every option is the emblem, the name
 * and the rank span. Picking a tier is only possible from here — the list doubles as the
 * legend for the emblem column in the table.
 */
function TierDropdown({ tier, onTier, disabled }: { tier: TierLetter | null; onTier: (t: TierLetter | null) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = "lb-tier-options";

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(next: TierLetter | null) {
    onTier(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`flex h-14 w-full items-center gap-3 rounded-sm border bg-canvas pl-3 pr-10 text-left focus:outline-none focus:ring-2 focus:ring-info-border disabled:cursor-not-allowed disabled:opacity-40 ${
          open ? "border-ink" : "border-border-strong"
        }`}
      >
        {tier ? <TierEmblem tier={tier} name={TIER_NAMES[tier]} size="md" /> : <AllTile />}
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-ink">{tier ? TIER_NAMES[tier] : "All tiers"}</span>
          <small className="text-muted">{tier ? TIER_RANKS[tier] : "Everyone who is ranked"}</small>
        </span>
        <ChevronIcon className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Tier"
          className="absolute left-0 right-0 top-full z-20 mt-2 flex flex-col gap-0.5 rounded-lg border border-hairline bg-surface-soft p-1.5 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.35)]"
        >
          <Option selected={tier === null} onClick={() => choose(null)}>
            <AllTile />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="text-ink">All tiers</span>
              <small className="text-muted">Everyone who is ranked</small>
            </span>
          </Option>
          {TIER_LETTERS.map((letter) => (
            <Option key={letter} selected={tier === letter} onClick={() => choose(letter)}>
              <TierEmblem tier={letter} name={TIER_NAMES[letter]} size="md" />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="text-ink">{TIER_NAMES[letter]}</span>
                <small className="text-muted">{TIER_RANKS[letter]}</small>
              </span>
            </Option>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Option({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <li role="option" aria-selected={selected}>
      <button
        type="button"
        onClick={onClick}
        className={`flex h-14 w-full items-center gap-3 rounded-md px-3 text-left ${selected ? "bg-surface-strong" : "active:bg-surface-strong"}`}
      >
        {children}
        {selected ? (
          <span aria-hidden className="ml-auto text-ink">
            ✓
          </span>
        ) : null}
      </button>
    </li>
  );
}

function AllTile() {
  return <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-border-strong text-sm text-muted">All</span>;
}

function SearchIcon() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5 14 14" />
    </svg>
  );
}

export function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3.5 6l4.5 4.5L12.5 6" />
    </svg>
  );
}
