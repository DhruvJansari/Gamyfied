"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { RubberSegment } from "./bits/rubber-segment";
import { Reveal } from "./motion";

// The squad layer. Clans, clan leaderboards and clan battles are still being built, so the
// band says "in the works" up front and every number on it is an example. Oxide coral is the
// page's one loud warm moment: competition runs hot. Battle rounds are the evaluation areas
// from the product plan (ideas, problem solving, popularity, contribution).

type ClanId = "byte-club" | "kernel-panic";

const CLANS: Record<ClanId, { name: string; tag: string; plate: string }> = {
  "byte-club": { name: "Byte Club", tag: "BC", plate: "bg-on-dark text-signature-coral" },
  "kernel-panic": { name: "Kernel Panic", tag: "KP", plate: "bg-signature-yellow text-on-pastel" },
};

const ROUNDS = [
  { area: "Ideas", left: 58 },
  { area: "Problem solving", left: 44 },
  { area: "Popularity", left: 52 },
  { area: "Contribution", left: 63 },
];

const STANDINGS = [
  { name: "Byte Club", tag: "BC", plate: "bg-on-dark text-signature-coral" },
  { name: "Kernel Panic", tag: "KP", plate: "bg-signature-yellow text-on-pastel" },
  { name: "Hot Reload", tag: "HR", plate: "bg-signature-peach text-on-pastel" },
  { name: "Night Shift", tag: "NS", plate: "bg-signature-navy text-on-dark" },
  { name: "Zero Day", tag: "ZD", plate: "bg-signature-cream text-on-pastel" },
];

function Plate({ tag, plate, size = "md" }: { tag: string; plate: string; size?: "sm" | "md" }) {
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-xl font-medium tracking-tight ${plate} ${size === "md" ? "size-12 text-base" : "size-8 text-xs"}`}>
      {tag}
    </span>
  );
}

export function Clans() {
  const reduce = useReducedMotion();
  const [side, setSide] = useState<ClanId>("byte-club");
  const [picked, setPicked] = useState(false);

  return (
    <section id="clans" aria-labelledby="clans-title" className="texture-grain scroll-mt-16 bg-signature-coral text-on-dark">
      <div className="mx-auto max-w-7xl px-5 py-24 md:px-10 md:py-32">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-12">
          <div className="flex flex-col gap-8 lg:col-span-5">
            <Reveal className="flex flex-col gap-6">
              <span className="w-fit rounded-full border border-on-dark/35 px-3 py-1 text-sm text-on-dark/90">Clans · in the works</span>
              <h2 id="clans-title" className="text-[clamp(2.4rem,5.4vw,4.5rem)] leading-[0.98] tracking-[-0.04em] text-on-dark">
                Rank solo. Win as a clan.
              </h2>
              <p className="max-w-md text-on-dark/85">
                Start a clan or join one. Every win you stack counts for your squad, clans get their own leaderboard, and seasons turn it
                into clan battles. Your clan also gets a private space to talk shop.
              </p>
            </Reveal>
            <Reveal delay={120} className="flex flex-col gap-3">
              <span className="text-sm text-on-dark/75">Pick a side for this example battle</span>
              <RubberSegment
                aria-label="Pick a clan"
                size="lg"
                className="w-full max-w-sm"
                items={[
                  { value: "byte-club", label: "Byte Club" },
                  { value: "kernel-panic", label: "Kernel Panic" },
                ]}
                value={side}
                onChange={(v) => {
                  setSide(v as ClanId);
                  setPicked(true);
                }}
                trackColor="var(--signature-coral-deep)"
                thumbColor="var(--on-dark)"
                textColor="color-mix(in srgb, var(--on-dark) 80%, transparent)"
                activeTextColor="var(--signature-coral)"
              />
              <small className="min-h-6 text-on-dark/80" aria-live="polite">
                {picked ? `${CLANS[side].name} it is. Clans open soon, so hold that energy.` : "Drag the pill or tap a name."}
              </small>
            </Reveal>
          </div>

          <Reveal delay={80} className="lg:col-span-7">
            <div className="rounded-3xl bg-signature-coral-deep p-5 ring-1 ring-on-dark/10 md:p-7">
              <div className="flex items-center justify-between text-sm text-on-dark/70">
                <span>Clan battle</span>
                <span>Example · format not final</span>
              </div>

              <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
                {(["byte-club", "kernel-panic"] as ClanId[]).map((id, i) => {
                  const c = CLANS[id];
                  const mine = picked && side === id;
                  return (
                    <div
                      key={id}
                      className={`row-start-1 flex min-w-0 flex-col items-center gap-2 text-center sm:flex-row sm:gap-3 ${
                        i === 1 ? "col-start-3 sm:flex-row-reverse sm:text-right" : "col-start-1 sm:text-left"
                      }`}
                    >
                      <Plate tag={c.tag} plate={c.plate} />
                      <span className="flex min-w-0 flex-col">
                        <span className="text-lg leading-tight tracking-tight sm:text-xl md:text-2xl">{c.name}</span>
                        <span className={`text-xs transition-opacity duration-300 ${mine ? "text-signature-yellow opacity-100" : "opacity-0"}`}>Your pick</span>
                      </span>
                    </div>
                  );
                })}
                <span className="col-start-2 row-start-1 text-sm text-on-dark/60">vs</span>
              </div>

              <ul className="mt-7 flex flex-col gap-4">
                {ROUNDS.map((r) => (
                  <li key={r.area} tabIndex={0} className="group flex flex-col gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-on-dark/60">
                    <span className="flex items-center justify-between text-sm">
                      <span className="text-on-dark/90">{r.area}</span>
                      <span className="tabular-nums text-on-dark/70 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                        {r.left}% · {100 - r.left}%
                      </span>
                    </span>
                    <span className="flex h-2.5 overflow-hidden rounded-full bg-signature-yellow">
                      <motion.span
                        className="h-full rounded-r-full bg-on-dark"
                        initial={{ width: reduce ? `${r.left}%` : "50%" }}
                        whileInView={{ width: `${r.left}%` }}
                        viewport={{ once: true, margin: "-10% 0px" }}
                        transition={{ type: "spring", stiffness: 90, damping: 18, delay: 0.2 }}
                      />
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex items-center justify-between border-t border-on-dark/15 pt-5 text-sm">
                <span className="text-on-dark/70">Rounds won</span>
                <span className="text-on-dark">
                  Byte Club 3 <span className="text-on-dark/50">·</span> Kernel Panic 1
                </span>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={60}>
          <div className="mt-14 flex flex-col gap-4">
            <span className="text-sm text-on-dark/75">Clan standings · example</span>
            <ol className="flex flex-col divide-y divide-on-dark/15 overflow-hidden rounded-2xl ring-1 ring-on-dark/20 md:flex-row md:divide-x md:divide-y-0">
              {STANDINGS.map((c, i) => (
                <li key={c.name} className="flex flex-1 items-center gap-3 px-4 py-4 transition-colors hover:bg-on-dark/5">
                  <span className="w-5 font-mono text-sm text-on-dark/60">{i + 1}</span>
                  <Plate tag={c.tag} plate={c.plate} size="sm" />
                  <span className="truncate text-[15px] text-on-dark">{c.name}</span>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
