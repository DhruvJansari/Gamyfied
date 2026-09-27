"use client";

import { useState } from "react";

import { TierEmblem } from "@/components/tier-emblem";

import { FlipCard } from "./bits/flip-card";
import { RollingNumber } from "./bits/rolling-number";
import { LogoMark } from "./logo-mark";

// The hero's object: a developer's standing card. Front = where you stand (rank, tier,
// score, the proof you linked). Back = what that number is made of, i.e. trust levels.
// Everything on it is example data; the caption says so. Tier B uses the product's own
// emblem (TierEmblem) so the card matches the real leaderboard.

const TREND = [18, 22, 20, 29, 27, 36, 41, 39, 52, 58, 63, 71];

function Sparkline() {
  const w = 300;
  const h = 44;
  const max = Math.max(...TREND);
  const min = Math.min(...TREND);
  const pts = TREND.map((v, i) => [(i / (TREND.length - 1)) * w, h - 4 - ((v - min) / (max - min)) * (h - 8)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1]!;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden className="h-11 w-full overflow-visible">
      <defs>
        <linearGradient id="sbd-spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--signature-blue-bright)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--signature-blue-bright)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w} ${h} L0 ${h} Z`} fill="url(#sbd-spark-fill)" />
      <path d={line} pathLength={1} className="draw-line" fill="none" stroke="var(--signature-blue-bright)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill="var(--signature-yellow)" />
    </svg>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="size-3.5 shrink-0 fill-none stroke-signature-blue-bright" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

const label = "text-[11px] tracking-[0.18em] text-on-dark/55";

function Front() {
  return (
    <div className="relative flex h-full flex-col p-6">
      <div aria-hidden className="pointer-events-none absolute -top-40 -right-36 size-104 rounded-full bg-[radial-gradient(circle,var(--signature-blue)_0%,transparent_65%)] opacity-70" />
      <div aria-hidden className="pointer-events-none absolute -bottom-44 -left-40 size-104 rounded-full bg-[radial-gradient(circle,var(--signature-coral)_0%,transparent_65%)] opacity-40" />

      <div className="relative flex items-center justify-between">
        <span className="flex items-center gap-2 text-[12px] tracking-[0.22em] text-on-dark/80">
          <LogoMark className="size-4" lit="fill-signature-blue-bright" base="fill-on-dark/70" />
          STANDBYDEV
        </span>
        <span className="rounded-full border border-on-dark/15 px-2.5 py-1 text-[10px] tracking-[0.16em] text-on-dark/70">PRESEASON</span>
      </div>

      <div className="relative mt-6 flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-full bg-linear-to-br from-signature-blue to-signature-navy-raised text-lg text-on-dark ring-2 ring-on-dark/15">
          Y
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-mono text-[15px] text-on-dark">@yourhandle</span>
          <span className="text-[13px] text-on-dark/60">Full-stack builder</span>
        </span>
      </div>

      <div className="relative mt-7 flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className={label}>RANK</span>
          <RollingNumber prefix="#" value={412} from={640} digits={3} className="text-[64px] tracking-[-0.04em] text-on-dark" />
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={label}>TIER</span>
          <TierEmblem tier="B" size="lg" className="drop-shadow-[0_6px_14px_rgb(0_0_0/0.35)]" />
        </div>
      </div>
      <span className="relative mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-signature-yellow/15 px-2.5 py-1 text-[12px] text-signature-yellow">
        <svg viewBox="0 0 10 10" aria-hidden className="size-2.5 fill-current">
          <path d="M5 1.5 9 8.5H1z" />
        </svg>
        38 spots this week
      </span>

      <div className="relative mt-auto flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <span className={label}>SCORE</span>
          <RollingNumber value={1764} from={1388} digits={4} className="text-[28px] tracking-[-0.02em] text-on-dark" />
        </div>
        <Sparkline />
      </div>

      <ul className="relative mt-4 flex flex-wrap gap-1.5" aria-label="Linked proof">
        {["GitHub", "LeetCode", "Live site"].map((p) => (
          <li key={p} className="inline-flex items-center gap-1.5 rounded-full bg-on-dark/8 px-2.5 py-1 text-[12px] text-on-dark/85 ring-1 ring-on-dark/10">
            <Check />
            {p}
          </li>
        ))}
      </ul>

      <div className="relative mt-4 flex items-center justify-between font-mono text-[11px] text-on-dark/45">
        <span>DEV ID · #4QX8K2M</span>
        <span className="flex items-center gap-1.5">
          FLIP
          <FlipIcon />
        </span>
      </div>
    </div>
  );
}

const LEVELS = [
  { name: "GitHub", level: "Linked", weight: 62, tone: "bg-signature-blue-bright/15 text-signature-blue-bright", bar: "bg-signature-blue-bright" },
  { name: "LeetCode", level: "Linked", weight: 62, tone: "bg-signature-blue-bright/15 text-signature-blue-bright", bar: "bg-signature-blue-bright" },
  { name: "Live site", level: "Verified", weight: 100, tone: "bg-signature-yellow/15 text-signature-yellow", bar: "bg-signature-yellow" },
  { name: "LinkedIn", level: "Claimed", weight: 22, tone: "bg-on-dark/10 text-on-dark/70", bar: "bg-on-dark/45" },
];

function Back({ flipped }: { flipped: boolean }) {
  return (
    <div className="relative flex h-full flex-col p-6">
      <div aria-hidden className="pointer-events-none absolute -top-44 -left-36 size-104 rounded-full bg-[radial-gradient(circle,var(--signature-blue)_0%,transparent_65%)] opacity-50" />
      <div className="relative flex items-center justify-between">
        <span className={label}>PROOF, NOT HYPE</span>
        <span className="rounded-full border border-on-dark/15 px-2.5 py-1 text-[10px] tracking-[0.16em] text-on-dark/70">PRESEASON</span>
      </div>
      <span className="relative mt-4 text-[26px] leading-tight tracking-[-0.02em] text-on-dark">What&apos;s behind the number.</span>

      <ul className="relative mt-6 flex flex-col gap-4">
        {LEVELS.map((l, i) => (
          <li key={l.name} className="flex flex-col gap-2">
            <span className="flex items-center justify-between text-[14px] text-on-dark/90">
              {l.name}
              <span className={`rounded-full px-2 py-0.5 text-[11px] ${l.tone}`}>{l.level}</span>
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-on-dark/10">
              <span
                className={`block h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none ${l.bar}`}
                style={{ width: flipped ? `${l.weight}%` : "0%", transitionDelay: flipped ? `${250 + i * 90}ms` : "0ms" }}
              />
            </span>
          </li>
        ))}
      </ul>

      <dl className="relative mt-7 grid grid-cols-[4.75rem_1fr] gap-x-3 gap-y-1.5 border-t border-on-dark/10 pt-5 text-[12px] leading-snug">
        <dt className="text-on-dark/50">Claimed</dt>
        <dd className="text-on-dark/80">you typed it</dd>
        <dt className="text-signature-blue-bright">Linked</dt>
        <dd className="text-on-dark/80">you signed in with it</dd>
        <dt className="text-signature-yellow">Verified</dt>
        <dd className="text-on-dark/80">an AI agent checked it (coming soon)</dd>
      </dl>

      <div className="relative mt-auto flex items-center justify-between font-mono text-[11px] text-on-dark/45">
        <span>RECEIPTS &gt; VIBES</span>
        <span className="flex items-center gap-1.5">
          BACK
          <FlipIcon />
        </span>
      </div>
    </div>
  );
}

function FlipIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="size-4 fill-none stroke-current" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 9a6.5 6.5 0 0 1 11.3-4.4L16.5 6.5M16.5 3v3.5H13M16.5 11a6.5 6.5 0 0 1-11.3 4.4L3.5 13.5M3.5 17v-3.5H7" />
    </svg>
  );
}

export function StandingCard() {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="flex flex-col items-center gap-5">
      <FlipCard
        front={<Front />}
        back={<Back flipped={flipped} />}
        onFlipChange={setFlipped}
        width="min(360px, 100%)"
        height={480}
        ariaLabel="Example standing card. Press to flip between your standing and the proof behind it."
      />
      <span className="flex items-center gap-2 text-sm text-muted" aria-live="polite">
        <FlipIcon />
        {flipped ? "That's the proof behind the number." : "Example card. Tap or drag it to flip."}
      </span>
    </div>
  );
}
