"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { TierEmblem } from "@/components/tier-emblem";

import { RubberSegment } from "./bits/rubber-segment";
import { Reveal } from "./motion";

// "Even the leaderboard is yours to remix." Built on the real row structure
// (app/leaderboard/leaderboard-row.tsx): a user-owned canvas layer underneath and the
// platform layer (rank, name, tier, score) on top, which themes can never touch. Ready-made
// themes are the defaults anyone can use; "Write your own" is live CSS on your canvas only.
// It runs in the visitor's browser and nothing is saved.
//
// The theme strings below are examples of CSS a user would write, i.e. content, not our
// design tokens, which is why they carry literal colours (project/Rules.md, tokens).

const READY: { id: string; name: string; css: string; swatch: string }[] = [
  { id: "clean", name: "Clean", css: "", swatch: "bg-canvas" },
  { id: "midnight", name: "Midnight", css: "background: linear-gradient(90deg, #0b1430, #1d4ed8);", swatch: "bg-linear-to-r from-signature-navy to-signature-blue" },
  { id: "sunset", name: "Sunset", css: "background: linear-gradient(90deg, #aa2d00, #fcab79);", swatch: "bg-linear-to-r from-signature-coral to-signature-peach" },
  { id: "gold", name: "Gold rush", css: "background: linear-gradient(100deg, #d9a441, #f4d35e 55%, #fffaf2);", swatch: "bg-linear-to-r from-signature-mustard via-signature-yellow to-signature-paper" },
  { id: "paper", name: "Paper", css: "background: #f5e9d4;\nbox-shadow: inset 6px 0 0 #aa2d00;", swatch: "bg-signature-cream" },
];

const STARTER = `/* Your row, your rules. */
background: linear-gradient(90deg, #1d4ed8, #fcab79);
border-radius: 14px;`;

export function BoardThemes() {
  const [mode, setMode] = useState<"ready" | "custom">("ready");
  const [readyId, setReadyId] = useState("midnight");
  const [code, setCode] = useState(STARTER);
  const canvasRef = useRef<HTMLDivElement>(null);

  const css = mode === "ready" ? READY.find((t) => t.id === readyId)!.css : code;

  // Live preview: debounce only, no loader (project/Rules.md, loading states).
  useEffect(() => {
    const t = setTimeout(() => {
      if (canvasRef.current) canvasRef.current.style.cssText = css;
    }, 120);
    return () => clearTimeout(t);
  }, [css]);

  return (
    <section aria-labelledby="themes-title" className="bg-page">
      <div className="mx-auto flex max-w-5xl flex-col items-center px-5 py-24 text-center md:px-10 md:py-32">
        <Reveal className="flex flex-col items-center gap-6">
          <span className="rounded-full border border-hairline bg-canvas px-3 py-1 text-sm text-body">Festivals · planned</span>
          <h2 id="themes-title" className="max-w-[16ch] text-[clamp(2.4rem,5.4vw,4.5rem)] leading-[0.98] tracking-[-0.04em]">
            Even the leaderboard is yours to remix.
          </h2>
          <p className="max-w-2xl text-body">
            Every row has a canvas that belongs to its owner. Use a ready-made theme or write your own CSS. During festivals the community
            votes, and the winning themes take over the whole board with the creator&apos;s name on them.
          </p>
        </Reveal>

        <Reveal delay={120} className="mt-14 flex w-full flex-col items-stretch gap-6 text-left">
          <div className="relative overflow-hidden rounded-2xl border border-hairline bg-canvas shadow-[0_24px_60px_-36px_rgb(0_0_0/0.4)] [contain:paint]">
            <div ref={canvasRef} aria-hidden className="absolute inset-0 transition-[background] duration-500" />
            <div className="relative flex min-h-20 items-center gap-3 px-4 md:gap-4 md:px-6">
              <span className="rounded-lg bg-canvas/85 px-2 py-1 font-mono text-sm text-muted ring-1 ring-hairline backdrop-blur">#12</span>
              <span className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg bg-canvas/85 py-1 pr-3 pl-1 ring-1 ring-hairline backdrop-blur sm:flex-none">
                <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-md bg-linear-to-br from-signature-blue to-signature-navy text-sm text-on-dark">
                  Y
                </span>
                <span className="truncate font-mono text-sm text-ink">@yourhandle</span>
              </span>
              <span className="ml-auto flex items-center gap-2 rounded-lg bg-canvas/85 py-1 pr-3 pl-1 ring-1 ring-hairline backdrop-blur">
                <TierEmblem tier="S" size="sm" />
                <span className="text-lg tabular-nums text-ink">4,812</span>
              </span>
            </div>
          </div>
          <small className="-mt-3 text-center text-muted">Rank, name, tier and score stay platform-owned. Themes only paint the canvas behind them.</small>

          <div className="flex flex-col items-center gap-6">
            <RubberSegment
              aria-label="Theme source"
              items={[
                { value: "ready", label: "Ready-made" },
                { value: "custom", label: "Write your own" },
              ]}
              value={mode}
              onChange={(v) => setMode(v as "ready" | "custom")}
              className="w-full max-w-xs"
            />

            <AnimatePresence mode="wait" initial={false}>
              {mode === "ready" ? (
                <motion.div
                  key="ready"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22 }}
                  role="radiogroup"
                  aria-label="Ready-made themes"
                  className="flex flex-wrap justify-center gap-3"
                >
                  {READY.map((t) => {
                    const on = t.id === readyId;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setReadyId(t.id)}
                        className={`group flex items-center gap-2.5 rounded-xl border py-2 pr-4 pl-2 text-sm transition-[border-color,background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] ${
                          on ? "border-ink bg-canvas text-ink shadow-[0_8px_20px_-12px_rgb(0_0_0/0.45)]" : "border-hairline bg-canvas text-body hover:border-border-strong hover:text-ink"
                        }`}
                      >
                        <span aria-hidden className={`size-7 rounded-lg ring-1 ring-hairline ${t.swatch}`} />
                        {t.name}
                        {on ? (
                          <svg viewBox="0 0 16 16" aria-hidden className="size-3.5 fill-none stroke-accent" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3.5 8.5l3 3 6-7" />
                          </svg>
                        ) : null}
                      </button>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div
                  key="custom"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22 }}
                  className="w-full max-w-2xl overflow-hidden rounded-2xl bg-signature-navy text-on-dark ring-1 ring-on-dark/10"
                >
                  <div className="flex items-center justify-between border-b border-on-dark/10 px-4 py-2.5 text-xs">
                    <span className="flex items-center gap-2 text-on-dark/70">
                      <span aria-hidden className="relative flex size-2">
                        <span className="live-ping absolute inset-0 rounded-full bg-signature-blue-bright" />
                        <span className="relative size-2 rounded-full bg-signature-blue-bright" />
                      </span>
                      your-row.css · live preview
                    </span>
                    <span className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setCode(READY.find((t) => t.id === readyId)?.css || STARTER)}
                        className="rounded-md px-2 py-1 text-on-dark/80 transition-colors hover:bg-on-dark/10 hover:text-on-dark"
                      >
                        Remix {READY.find((t) => t.id === readyId)?.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCode(STARTER)}
                        className="rounded-md px-2 py-1 text-on-dark/80 transition-colors hover:bg-on-dark/10 hover:text-on-dark"
                      >
                        Reset
                      </button>
                    </span>
                  </div>
                  <label className="sr-only" htmlFor="theme-css">
                    CSS for your row canvas
                  </label>
                  <textarea
                    id="theme-css"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    spellCheck={false}
                    rows={5}
                    className="block w-full resize-none bg-transparent px-4 py-3 font-mono text-[13px] leading-6 text-on-dark caret-signature-yellow outline-none placeholder:text-on-dark/40 selection:bg-signature-blue/60"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
