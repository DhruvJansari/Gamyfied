"use client";

import { useState } from "react";

import { Points, TrustChip } from "@/components/profile-ui";
import type { OwnerProfile, ScoreSection, ScoreSectionKey } from "@/services/profiles";

// Renders the server's breakdown as-is. No arithmetic happens here beyond the bar width:
// if a number looks wrong, the scoring engine is where to look.

export function ScoreBreakdown({ profile }: { profile: OwnerProfile }) {
  const { score, scoreBreakdown } = profile;
  const [open, setOpen] = useState<ScoreSectionKey | null>(null);

  return (
    <section aria-labelledby="score-title" className="flex flex-col gap-5 rounded-lg border border-hairline bg-surface-soft p-5 md:p-6">
      <header className="flex items-baseline justify-between gap-3">
        <h2 id="score-title" className="text-lg md:text-xl">
          Score breakdown
        </h2>
        <span className="tabular-nums text-accent">+{score.profile}</span>
      </header>

      <ul className="flex flex-col gap-4">
        {scoreBreakdown.sections.map((section) => (
          <SectionRow key={section.key} section={section} open={open === section.key} onToggle={() => setOpen(open === section.key ? null : section.key)} />
        ))}
      </ul>
    </section>
  );
}

function SectionRow({ section, open, onToggle }: { section: ScoreSection; open: boolean; onToggle: () => void }) {
  const id = `score-${section.key}`;
  const width = section.max ? Math.min(100, Math.round((section.points / section.max) * 100)) : 0;
  return (
    <li className="flex flex-col gap-2">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={onToggle} className="flex flex-col gap-2 text-left">
        <span className="flex items-center justify-between gap-3">
          <span className="text-ink">
            {section.label}
            {section.optional ? <span className="text-muted"> (optional)</span> : null}
          </span>
          <span className="tabular-nums text-ink">+{section.points}</span>
        </span>
        <span aria-hidden className="block h-1.5 w-full overflow-hidden rounded-pill bg-surface-strong">
          <span className="block h-full rounded-pill bg-accent transition-[width]" style={{ width: `${width}%` }} />
        </span>
      </button>
      {open ? (
        <ul id={id} className="mt-1 flex flex-col gap-2 rounded-md bg-page p-3">
          {section.items.length === 0 ? (
            <li>
              <small className="text-muted">{section.optional ? "Nothing here — and that's fine." : "Nothing added yet."}</small>
            </li>
          ) : (
            section.items.map((item) => (
              <li key={item.key} className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
                    <span className="truncate">{item.label}</span>
                    {item.trustLevel ? <TrustChip level={item.trustLevel} /> : null}
                  </span>
                  <Points value={item.points} max={item.max} />
                </div>
                {item.verificationPoints !== undefined && item.verificationPoints > 0 ? (
                  <small className="text-muted">
                    {item.evidencePoints} evidence + {item.verificationPoints} verified
                  </small>
                ) : null}
                {item.hint ? <small className="text-muted">{item.hint}</small> : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </li>
  );
}
