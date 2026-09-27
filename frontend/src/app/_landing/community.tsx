"use client";

import { motion, useAnimationControls } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { TierEmblem } from "@/components/tier-emblem";

import { TextLink } from "./action";
import { StatusMark } from "./bits/status-mark";
import { Reveal } from "./motion";

// Connection. Public profiles are live; the community space, challenges and discovery search
// are being built, so the chip says so and the preview is labelled. Left: what you do here,
// as three plain lines. Right: one small working preview of each (like, accept, find).

const WAYS = [
  { n: "01", title: "Talk shop", body: "An open community for builds, questions and hot takes. Plus a private room for your clan." },
  { n: "02", title: "Run challenges", body: "Drop a challenge, a mini-game or a creative prompt and let other devs take a shot at it." },
  { n: "03", title: "Get discovered", body: "Your public profile shows what you built, what's proven and where you stand. That's how builders find each other here." },
];

function Heart({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={`size-[18px] transition-colors duration-200 ${on ? "fill-signature-peach stroke-signature-peach" : "fill-none stroke-current"}`} strokeWidth="1.6" strokeLinejoin="round">
      <path d="M10 16.5s-6.5-3.9-6.5-8.6A3.6 3.6 0 0 1 10 5.6a3.6 3.6 0 0 1 6.5 2.3c0 4.7-6.5 8.6-6.5 8.6Z" />
    </svg>
  );
}

function LikeButton() {
  const [on, setOn] = useState(false);
  const controls = useAnimationControls();
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => {
        setOn((v) => !v);
        controls.start({ scale: [1, 1.35, 0.92, 1], transition: { duration: 0.45, ease: "easeOut" } });
      }}
      className={`inline-flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm transition-colors ${on ? "text-signature-peach" : "text-on-dark/75 hover:bg-on-dark/10 hover:text-on-dark"}`}
    >
      <motion.span animate={controls} className="flex">
        <Heart on={on} />
      </motion.span>
      <span className="tabular-nums">{on ? 43 : 42}</span>
      <span className="sr-only">likes</span>
    </button>
  );
}

function AcceptButton() {
  const [state, setState] = useState<"idle" | "joining" | "in">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      onClick={() => {
        if (state !== "idle") {
          setState("idle");
          return;
        }
        setState("joining");
        timer.current = setTimeout(() => setState("in"), 900);
      }}
      className={`inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-[background-color,color,transform] duration-200 active:scale-95 ${
        state === "in" ? "bg-signature-blue text-on-dark" : "bg-on-dark text-on-pastel hover:bg-signature-paper"
      }`}
    >
      {state === "idle" ? "Accept" : null}
      {state !== "idle" ? <StatusMark status={state === "in" ? "done" : "running"} size={16} color="currentColor" doneColor="currentColor" /> : null}
      {state === "joining" ? "Joining" : state === "in" ? "You're in" : null}
    </button>
  );
}

const RESULTS = [
  { handle: "rustacean_riya", tier: "B" as const, note: "3 live projects · Rust, WASM" },
  { handle: "ferris_fan", tier: "C" as const, note: "2 live projects · Rust, Tauri" },
  { handle: "wasm_wizard", tier: "C" as const, note: "1 live project · Go, WASM" },
  { handle: "pixel_pusher", tier: "S" as const, note: "5 live projects · TypeScript, React" },
];

export function Community() {
  const [query, setQuery] = useState("rust");
  const q = query.trim().toLowerCase();
  const results = RESULTS.filter((r) => !q || r.handle.includes(q) || r.note.toLowerCase().includes(q));
  return (
    <section id="community" aria-labelledby="community-title" className="texture-grain scroll-mt-16 bg-signature-navy text-on-dark">
      <div className="mx-auto max-w-7xl px-5 py-24 md:px-10 md:py-32">
        <Reveal className="flex max-w-3xl flex-col gap-6">
          <span className="w-fit rounded-full border border-on-dark/25 px-3 py-1 text-sm text-on-dark/85">Community · being built · public profiles are live</span>
          <h2 id="community-title" className="text-[clamp(2.4rem,5.4vw,4.5rem)] leading-[0.98] tracking-[-0.04em] text-on-dark">
            Find your people. Get found by them.
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14">
          <div className="flex flex-col lg:col-span-5">
            <ol className="flex flex-col">
              {WAYS.map((w, i) => (
                <Reveal as="li" key={w.n} delay={i * 90} className="flex gap-5 border-t border-on-dark/15 py-7 first:border-t-0 first:pt-0">
                  <span className="pt-1.5 font-mono text-xs text-signature-blue-bright">{w.n}</span>
                  <span className="flex flex-col gap-2">
                    <span className="text-2xl tracking-[-0.02em] text-on-dark md:text-3xl">{w.title}</span>
                    <span className="text-base leading-7 text-on-dark/75">{w.body}</span>
                  </span>
                </Reveal>
              ))}
            </ol>
            <Reveal delay={300} className="mt-2">
              <TextLink href="/leaderboard" className="text-on-dark">
                Browse public profiles on the leaderboard
              </TextLink>
            </Reveal>
          </div>

          <Reveal delay={120} className="lg:col-span-7">
            <div className="flex flex-col gap-3 rounded-3xl bg-signature-navy-raised p-3 ring-1 ring-on-dark/10">
              <div className="flex items-center justify-between px-2 pt-1 text-xs text-on-dark/60">
                <span>Preview</span>
                <span>Example people and numbers</span>
              </div>

              <article className="rounded-2xl bg-signature-navy p-4 ring-1 ring-on-dark/10 md:p-5">
                <header className="flex items-center gap-3">
                  <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-signature-peach text-sm text-on-pastel">
                    S
                  </span>
                  <span className="flex flex-col">
                    <span className="font-mono text-sm text-on-dark">@segfault</span>
                    <span className="text-xs text-on-dark/55">in #showcase</span>
                  </span>
                </header>
                <p className="mt-3 text-base leading-7 text-on-dark/90">Shipped a Rust CLI that renames ten thousand files in under a second. Roast it.</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="flex gap-1.5 text-xs">
                    <span className="rounded-full bg-on-dark/10 px-2.5 py-1 text-on-dark/80">repo</span>
                    <span className="rounded-full bg-on-dark/10 px-2.5 py-1 text-on-dark/80">live</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <LikeButton />
                    <span className="inline-flex h-9 items-center gap-2 px-2 text-sm text-on-dark/60">12 replies</span>
                  </span>
                </div>
              </article>

              <article className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-signature-blue p-4 md:p-5">
                <span className="flex flex-col gap-1">
                  <span className="text-xs text-on-dark/75">Challenge by @tabs_not_spaces · 3 days left</span>
                  <span className="text-lg leading-snug text-on-dark">Build a URL shortener in under 100 lines.</span>
                </span>
                <AcceptButton />
              </article>

              <div className="rounded-2xl bg-signature-navy p-4 ring-1 ring-on-dark/10 md:p-5">
                <label className="flex h-11 items-center gap-2.5 rounded-xl bg-on-dark/8 px-3.5 text-sm text-on-dark ring-1 ring-on-dark/10 transition-shadow focus-within:ring-2 focus-within:ring-signature-blue-bright">
                  <svg viewBox="0 0 20 20" aria-hidden className="size-4 shrink-0 fill-none stroke-current text-on-dark/60" strokeWidth="1.7" strokeLinecap="round">
                    <circle cx="9" cy="9" r="5.5" />
                    <path d="m13.2 13.2 3.3 3.3" />
                  </svg>
                  <span className="sr-only">Search example developers</span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Try rust, wasm or tauri"
                    className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-on-dark/45"
                  />
                </label>
                <ul className="mt-3 flex flex-col" aria-live="polite">
                  {results.length === 0 ? <li className="px-2 py-2.5 text-sm text-on-dark/60">Nobody matches in this preview. Real discovery search is coming.</li> : null}
                  {results.map((r) => (
                    <li key={r.handle} className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-on-dark/5">
                      <TierEmblem tier={r.tier} size="sm" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-mono text-sm text-on-dark">@{r.handle}</span>
                        <span className="truncate text-xs text-on-dark/55">{r.note}</span>
                      </span>
                      <span className="text-xs text-signature-blue-bright opacity-0 transition-opacity group-hover:opacity-100">Discovery search is coming</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
