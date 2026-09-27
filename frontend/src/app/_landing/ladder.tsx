"use client";

import { LayoutGroup, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { TierEmblem } from "@/components/tier-emblem";
import type { TierLetter } from "@/services/leaderboard";

import { TextLink } from "./action";
import { RollingNumber } from "./bits/rolling-number";
import { SlideCommit } from "./bits/slide-commit";
import { SparkBurst } from "./bits/spark-burst";
import { Reveal } from "./motion";

// Score, rank and tier, taught by doing. The tower is the real tier ladder (same bands as the
// leaderboard: S is the top 20). The board is a made-up slice around rank 1,000, where B tier
// ends. Slide to ship a project and you take the last B seat. Cream band; its ink is fixed
// because cream does not flip in dark mode (DESIGN.md).

const TIERS: { tier: TierLetter; span: string; width: number; tone: string }[] = [
  { tier: "S", span: "Top 20", width: 16, tone: "bg-on-pastel" },
  { tier: "A", span: "21 to 200", width: 30, tone: "bg-on-pastel/80" },
  { tier: "B", span: "201 to 1,000", width: 46, tone: "bg-on-pastel/60" },
  { tier: "C", span: "1,001 to 5,000", width: 64, tone: "bg-on-pastel/40" },
  { tier: "D", span: "5,001 to 20,000", width: 82, tone: "bg-on-pastel/25" },
  { tier: "E", span: "20,000 and up", width: 100, tone: "bg-on-pastel/15" },
];

const ROW_H = 60;
const HEAD_H = 52;
const FIRST_RANK = 998;
const LAST_B = 1000;

type Player = { handle: string; score: number; you?: boolean };
const CROWD: Player[] = [
  { handle: "tabs_not_spaces", score: 1642 },
  { handle: "segfault", score: 1630 },
  { handle: "lgtm", score: 1618 },
  { handle: "yak_shaver", score: 1605 },
  { handle: "nightly_build", score: 1597 },
];
const YOU_BEFORE = 1590;
const YOU_AFTER = 1620;

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry?.contentRect.width ?? 0)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export function Ladder() {
  const [shipped, setShipped] = useState(false);
  const [fire, setFire] = useState(0);
  const [slideKey, setSlideKey] = useState(0);
  const [slotRef, slotWidth] = useWidth<HTMLDivElement>();
  const boardRef = useRef<HTMLDivElement>(null);
  const [sparkAt, setSparkAt] = useState({ x: 0.5, y: 0.5 });

  const players: Player[] = [...CROWD, { handle: "you", score: shipped ? YOU_AFTER : YOU_BEFORE, you: true }];
  const order = [...players].sort((a, b) => b.score - a.score);
  const youIndex = order.findIndex((p) => p.you);
  const youRank = FIRST_RANK + youIndex;
  const youTier: TierLetter = youRank <= LAST_B ? "B" : "C";
  const tierAt = (i: number): TierLetter => (FIRST_RANK + i <= LAST_B ? "B" : "C");

  function celebrate() {
    // Burst where "you" lands: the last B seat, measured against the whole card.
    const h = boardRef.current?.getBoundingClientRect().height ?? 1;
    setSparkAt({ x: 0.42, y: (HEAD_H + (LAST_B - FIRST_RANK) * ROW_H + ROW_H / 2) / h });
    setShipped(true);
    setFire((f) => f + 1);
  }
  function reset() {
    setShipped(false);
    setSlideKey((k) => k + 1);
  }

  return (
    <section id="board" aria-labelledby="ladder-title" className="scroll-mt-16 bg-signature-cream text-on-pastel">
      <div className="mx-auto max-w-7xl px-5 py-24 md:px-10 md:py-32">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <Reveal className="flex max-w-3xl flex-col gap-5">
            <span className="text-sm font-medium text-signature-coral">The leaderboard</span>
            <h2 id="ladder-title" className="text-[clamp(2.4rem,5.4vw,4.5rem)] leading-[0.98] tracking-[-0.04em] text-on-pastel">
              S tier has 20 seats. Go take one.
            </h2>
          </Reveal>
          <Reveal delay={100} className="flex max-w-sm flex-col gap-4">
            <p className="text-on-pastel/75">Score is your number. Rank is your spot. Tier is your crowd. Every project you ship can move all three.</p>
            <TextLink href="/leaderboard" className="text-on-pastel">
              Open the real leaderboard
            </TextLink>
          </Reveal>
        </div>

        <LayoutGroup>
          <div className="mt-16 grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12">
            <Reveal className="lg:col-span-5">
              <ol aria-label="Tiers, top to bottom" className="flex flex-col gap-2.5">
                {TIERS.map((t) => {
                  const here = t.tier === youTier;
                  return (
                    <li key={t.tier} className="grid grid-cols-[1.75rem_minmax(0,1fr)_7rem] items-center gap-3">
                      <span className="text-xl tracking-tight text-on-pastel">{t.tier}</span>
                      <span className="flex h-10 items-center justify-center">
                        <span
                          className={`flex h-full items-center justify-center rounded-lg transition-colors duration-500 ${here ? "bg-signature-blue" : t.tone}`}
                          style={{ width: `${t.width}%` }}
                        >
                          {here ? (
                            <motion.span
                              layoutId="you-in-tower"
                              transition={{ type: "spring", stiffness: 260, damping: 26 }}
                              className="rounded-full bg-on-dark px-2.5 py-0.5 text-xs font-medium text-signature-blue"
                            >
                              you
                            </motion.span>
                          ) : null}
                        </span>
                      </span>
                      <span className="text-right text-sm tabular-nums text-on-pastel/70">{t.span}</span>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-6 max-w-sm text-base text-on-pastel/70">Tiers follow rank, so the seats up top are scarce. Somebody always wants yours.</p>
            </Reveal>

            <Reveal delay={120} className="lg:col-span-7">
              <div
                ref={boardRef}
                className="relative overflow-hidden rounded-3xl bg-signature-paper shadow-[0_30px_70px_-40px_rgb(24_29_38/0.5)] ring-1 ring-on-pastel/10"
              >
                <SparkBurst fire={fire} at={sparkAt} colorVar="--signature-coral" count={12} radius={64} size={16} />
                <div className="flex items-center justify-between border-b border-on-pastel/10 px-5 text-sm" style={{ height: HEAD_H }}>
                  <span className="text-on-pastel">Example board</span>
                  <span className="text-on-pastel/55">Made-up numbers</span>
                </div>

                <ol aria-label="Example leaderboard slice" className="relative" style={{ height: order.length * ROW_H }}>
                  <div aria-hidden className="absolute inset-x-0 z-20 border-t-2 border-dashed border-signature-coral/60" style={{ top: (LAST_B - FIRST_RANK + 1) * ROW_H - 1 }}>
                    <span className="absolute -top-3 right-4 rounded-full bg-signature-coral px-2.5 py-0.5 text-[11px] font-medium text-on-dark">B tier ends here</span>
                  </div>
                  {players.map((p) => {
                    const i = order.indexOf(p);
                    return (
                      <li
                        key={p.handle}
                        className={`absolute inset-x-0 top-0 flex items-center gap-3 border-b border-on-pastel/8 px-5 transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none ${
                          p.you ? "z-10 bg-signature-blue/10" : ""
                        }`}
                        style={{ height: ROW_H, transform: `translateY(${i * ROW_H}px)` }}
                      >
                        <RollingNumber prefix="#" value={FIRST_RANK + i} digits={4} className="w-16 shrink-0 text-sm text-on-pastel/60" />
                        <span
                          aria-hidden
                          className={`hidden size-8 shrink-0 items-center justify-center rounded-full text-sm sm:flex ${p.you ? "bg-signature-blue text-on-dark" : "bg-on-pastel/10 text-on-pastel/70"}`}
                        >
                          {p.handle[0]!.toUpperCase()}
                        </span>
                        <span className={`min-w-0 flex-1 truncate font-mono text-sm ${p.you ? "text-signature-blue" : "text-on-pastel"}`}>@{p.handle}</span>
                        {p.you && shipped ? (
                          <motion.span
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.35 }}
                            className="rounded-full bg-signature-yellow px-2 py-0.5 text-xs text-on-pastel"
                          >
                            ▲3
                          </motion.span>
                        ) : null}
                        <TierEmblem tier={tierAt(i)} size="sm" />
                        <span className="flex w-14 shrink-0 justify-end text-lg text-on-pastel">
                          <RollingNumber value={p.score} digits={4} />
                        </span>
                      </li>
                    );
                  })}
                </ol>

                <div className="flex flex-col gap-4 border-t border-on-pastel/10 px-5 py-5">
                  <p className="text-base text-on-pastel/80" aria-live="polite">
                    {shipped ? `You're #${youRank.toLocaleString("en-US")}. Last seat in B tier is yours. Sorry, @lgtm.` : "You're #1,003 in C tier. B tier ends three spots up."}
                  </p>
                  <div ref={slotRef} className="flex flex-wrap items-center gap-4">
                    {slotWidth > 0 ? (
                      <SlideCommit
                        key={slideKey}
                        label="Slide to ship a project"
                        doneLabel="Shipped"
                        width={Math.min(360, slotWidth)}
                        height={56}
                        trackColor="var(--on-pastel)"
                        trackInk="var(--signature-paper)"
                        handleColor="var(--signature-paper)"
                        handleInk="var(--on-pastel)"
                        successColor="var(--signature-blue)"
                        holdMs={0}
                        onConfirm={() => new Promise((resolve) => setTimeout(resolve, 650))}
                        onDone={celebrate}
                      />
                    ) : (
                      <span className="h-14" aria-hidden />
                    )}
                    {shipped ? (
                      <button
                        type="button"
                        onClick={reset}
                        className="h-10 rounded-xl px-3 text-sm text-on-pastel/80 underline-offset-4 transition-colors hover:bg-on-pastel/5 hover:text-on-pastel hover:underline"
                      >
                        Run it back
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </LayoutGroup>
      </div>
    </section>
  );
}
