"use client";

import type { Placement, PlacementTaskKey } from "@/services/profiles";

import type { ProfileTab } from "./profile-header";

// Shown until the user is ranked, then it disappears: the stats row carries the status.
// Each task row jumps to the tab where it is done — the checklist is a table of contents.

const TAB_FOR: Record<PlacementTaskKey, ProfileTab> = {
  BASIC_PROFILE: "overview",
  SOCIAL_IDENTITY: "identity",
  PROJECTS: "projects",
  PARTICIPATION: "community",
};

const TIME_FOR: Record<PlacementTaskKey, string> = {
  BASIC_PROFILE: "~5 min",
  SOCIAL_IDENTITY: "~3 min",
  PROJECTS: "~10 min",
  PARTICIPATION: "~5 min",
};

export function PlacementCard({ placement, onTab }: { placement: Placement; onTab: (tab: ProfileTab) => void }) {
  const remaining = placement.tasks.filter((t) => t.required && !t.done);

  return (
    <section aria-labelledby="placement-title" className="flex flex-col gap-5 rounded-lg border border-hairline bg-surface-soft p-5 md:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2 id="placement-title" className="text-lg md:text-xl">
            Get placed
          </h2>
          <small className="text-muted">
            {remaining.length} required {remaining.length === 1 ? "task" : "tasks"} left before you appear on the leaderboard. Under 30 minutes, start to finish.
          </small>
        </div>
        <small className="tabular-nums text-ink">
          {placement.requiredCompleted} / {placement.requiredTotal} required
        </small>
      </header>

      <ol className="flex gap-2" aria-hidden>
        {placement.tasks
          .filter((t) => t.required)
          .map((t) => (
            <li key={t.key} className={`h-1.5 flex-1 rounded-pill ${t.done ? "bg-accent" : "bg-surface-strong"}`} />
          ))}
      </ol>

      <ol className="flex flex-col divide-y divide-hairline">
        {placement.tasks.map((task, i) => (
          <li key={task.key} className="flex items-start gap-4 py-3">
            <span
              aria-hidden
              className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                task.done ? "border-accent bg-accent text-on-dark" : "border-border-strong text-muted"
              }`}
            >
              {task.done ? "✓" : i + 1}
            </span>
            <div className="flex flex-1 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={task.done ? "text-muted line-through" : "text-ink"}>{task.title}</span>
                {!task.required ? <small className="rounded-pill border border-hairline px-2 text-muted">Optional</small> : null}
                {!task.done ? <small className="text-muted">{TIME_FOR[task.key]}</small> : null}
              </div>
              {task.hint ? <small className="text-muted">{task.hint}</small> : null}
            </div>
            {!task.done ? (
              <button type="button" onClick={() => onTab(TAB_FOR[task.key])} className="shrink-0 text-sm text-link underline-offset-4 hover:underline">
                {task.required ? "Do it" : "Add or skip"}
              </button>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
