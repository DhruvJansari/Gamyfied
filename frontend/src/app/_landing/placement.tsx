"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { TierEmblem } from "@/components/tier-emblem";

import { ActionLink, TextLink } from "./action";
import { RollingNumber } from "./bits/rolling-number";
import { SparkBurst } from "./bits/spark-burst";
import { StatusMark, type StatusMarkStatus } from "./bits/status-mark";

// "How it works" is the product's real placement flow: three required tasks, then a rank.
// Steps auto-advance while the section is on screen; each step's ring (React Bits
// StatusMark) fills as its turn runs out. Picking a step yourself stops the tour. The panel
// on the right is a small working mock of that step, not a screenshot.

const STEPS = [
  { key: "profile", title: "Set up your profile", body: "Your handle, your stack, what you're into. About five minutes." },
  { key: "proof", title: "Link your proof", body: "Connect GitHub, add LeetCode, LinkedIn and more. Linked beats typed. Verified will beat everything." },
  { key: "projects", title: "Drop your projects", body: "Up to five builds, each with a repo and a live link. Receipts, not vibes." },
  { key: "placed", title: "Get your rank", body: "Finish those three and you land on the leaderboard with a real rank and tier." },
] as const;

const STEP_MS = 5600;
const TICKS = 28;

export function Placement() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [touring, setTouring] = useState(true);
  const [progress, setProgress] = useState(0);
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The tour clock. Progress is quantised so the ring updates a few times a second, not 60.
  useEffect(() => {
    if (!touring || !inView || paused || reduce) return;
    let raf = 0;
    let last = performance.now();
    let p = 0;
    let shown = -1;
    const tick = (t: number) => {
      p += (t - last) / STEP_MS;
      last = t;
      if (p >= 1) {
        p = 0;
        shown = -1;
        setActive((a) => (a + 1) % STEPS.length);
      }
      const q = Math.floor(p * TICKS) / TICKS;
      if (q !== shown) {
        shown = q;
        setProgress(q);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [touring, inView, paused, reduce, active]);

  function pick(i: number) {
    setTouring(false);
    setActive(i);
  }
  function onKey(e: KeyboardEvent) {
    const delta = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (active + delta + STEPS.length) % STEPS.length;
    pick(next);
    tabs.current[next]?.focus();
  }

  const statusOf = (i: number): StatusMarkStatus => (i < active ? "done" : i === active ? "running" : "pending");
  const tasksDone = Math.min(active, 3);

  return (
    <section ref={sectionRef} id="how" aria-labelledby="how-title" className="scroll-mt-16 bg-canvas">
      <div className="mx-auto max-w-7xl px-5 py-24 md:px-10 md:py-32">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="flex max-w-2xl flex-col gap-5">
            <span className="text-sm font-medium text-accent">How it works</span>
            <h2 id="how-title" className="text-[clamp(2.4rem,5.4vw,4.5rem)] leading-[0.98] tracking-[-0.04em]">
              Get placed. Then climb.
            </h2>
          </div>
          <p className="max-w-sm text-body">Like ranked matches, but for what you actually build. Three tasks and you&apos;re on the board.</p>
        </div>

        <div
          className="mt-14 grid grid-cols-1 gap-8 lg:mt-20 lg:grid-cols-12 lg:gap-10"
          onPointerEnter={(e) => e.pointerType === "mouse" && setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <div role="tablist" aria-label="Placement steps" aria-orientation="vertical" onKeyDown={onKey} className="flex flex-col gap-2 lg:col-span-5">
            {STEPS.map((s, i) => {
              const selected = i === active;
              return (
                <button
                  key={s.key}
                  ref={(el) => {
                    tabs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`how-tab-${s.key}`}
                  aria-selected={selected}
                  aria-controls="how-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => pick(i)}
                  className={`group flex w-full items-start gap-4 rounded-2xl border p-5 text-left transition-[background-color,border-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    selected
                      ? "border-hairline bg-page shadow-[0_1px_0_rgb(255_255_255/0.5)_inset,0_18px_40px_-28px_rgb(0_0_0/0.45)]"
                      : "border-transparent hover:border-hairline hover:bg-page/60"
                  }`}
                >
                  <StatusMark
                    status={statusOf(i)}
                    progress={selected ? (touring && !reduce ? progress : 1) : undefined}
                    size={26}
                    color={selected ? "var(--accent)" : "var(--muted)"}
                    doneColor="var(--accent)"
                    label={`Step ${i + 1}: ${statusOf(i) === "done" ? "done" : selected ? "current" : "next"}`}
                    className="mt-0.5"
                  />
                  <span className="flex flex-col gap-1.5">
                    <span className="flex items-baseline gap-3 text-xl tracking-[-0.02em] text-ink md:text-2xl">
                      <span className="font-mono text-xs text-muted">0{i + 1}</span>
                      {s.title}
                    </span>
                    <span className="text-[15px] leading-6 text-body">{s.body}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-[28px] border border-hairline bg-page p-2 shadow-[0_30px_80px_-40px_rgb(0_0_0/0.35)]">
              <div className="overflow-hidden rounded-[22px] border border-hairline bg-canvas">
                <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-4">
                  <span className="text-sm text-ink">Placement</span>
                  <span className="flex items-center gap-3">
                    <span aria-hidden className="flex gap-1.5">
                      {[0, 1, 2].map((t) => (
                        <span key={t} className={`h-1.5 w-8 rounded-full transition-colors duration-500 ${t < tasksDone ? "bg-accent" : "bg-surface-strong"}`} />
                      ))}
                    </span>
                    <span className="text-sm tabular-nums text-muted">{tasksDone} of 3 done</span>
                  </span>
                </div>
                <div id="how-panel" role="tabpanel" aria-labelledby={`how-tab-${STEPS[active]!.key}`} className="relative min-h-[380px] p-5 md:min-h-[400px] md:p-7">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={STEPS[active]!.key}
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, filter: "blur(4px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(4px)" }}
                      transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
                    >
                      {active === 0 ? <ProfileMock /> : active === 1 ? <ProofMock /> : active === 2 ? <ProjectsMock /> : <PlacedMock />}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const field = "flex flex-col gap-1.5";
const fieldLabel = "text-xs text-muted";
const fieldBox = "flex h-11 items-center rounded-lg border border-hairline bg-page px-3 text-[15px] text-ink";

const STACK = ["TypeScript", "React", "Postgres", "Rust", "Python", "Go"];

function ProfileMock() {
  const [picked, setPicked] = useState<string[]>(["TypeScript", "React"]);
  const done = picked.length >= 3;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-full bg-linear-to-br from-signature-blue to-signature-navy text-xl text-on-dark">Y</span>
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
          <div className={field}>
            <span className={fieldLabel}>Handle</span>
            <span className={`${fieldBox} font-mono`}>@yourhandle</span>
          </div>
          <div className={field}>
            <span className={fieldLabel}>Headline</span>
            <span className={`${fieldBox} truncate`}>Ships on weekends</span>
          </div>
        </div>
      </div>
      <div className={field}>
        <span className={fieldLabel}>Your stack (pick three or more)</span>
        <div className="flex flex-wrap gap-2">
          {STACK.map((t) => {
            const on = picked.includes(t);
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => setPicked((p) => (on ? p.filter((x) => x !== t) : [...p, t]))}
                className={`h-9 rounded-full border px-3.5 text-sm transition-[background-color,border-color,color,transform] duration-200 active:scale-95 ${
                  on ? "border-accent bg-accent text-canvas" : "border-hairline bg-page text-body hover:border-border-strong hover:text-ink"
                }`}
              >
                {on ? "✓ " : "+ "}
                {t}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between rounded-xl border border-hairline bg-page px-4 py-3">
        <span className="flex items-center gap-3 text-[15px] text-ink">
          <StatusMark status={done ? "done" : "pending"} size={22} color="var(--muted)" doneColor="var(--accent)" />
          Basic profile
        </span>
        <span className={`text-sm ${done ? "text-accent" : "text-muted"}`}>{done ? "Done" : `${3 - picked.length} more to go`}</span>
      </div>
    </div>
  );
}

type ProofLink = { name: string; state: "idle" | "linking" | "linked" | "claimed" };

function ProofMock() {
  const [links, setLinks] = useState<ProofLink[]>([
    { name: "GitHub", state: "idle" },
    { name: "LeetCode", state: "claimed" },
    { name: "LinkedIn", state: "claimed" },
  ]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const github = links[0]!;
  function connect() {
    if (github.state !== "idle") return;
    setLinks((l) => l.map((x, i) => (i === 0 ? { ...x, state: "linking" } : x)));
    timer.current = setTimeout(() => setLinks((l) => l.map((x, i) => (i === 0 ? { ...x, state: "linked" } : x))), 1100);
  }
  const strength = github.state === "linked" ? 74 : 38;

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-hairline rounded-xl border border-hairline">
        {links.map((l) => (
          <li key={l.name} className="flex items-center justify-between gap-3 px-4 py-3.5">
            <span className="flex items-center gap-3 text-[15px] text-ink">
              <StatusMark
                status={l.state === "linked" ? "done" : l.state === "linking" ? "running" : "pending"}
                size={22}
                color={l.state === "claimed" ? "var(--muted)" : "var(--accent)"}
                doneColor="var(--accent)"
              />
              {l.name}
            </span>
            {l.state === "idle" ? (
              <button
                type="button"
                onClick={connect}
                className="h-9 rounded-lg bg-primary px-3.5 text-sm font-medium text-on-primary transition-transform duration-150 hover:bg-primary-active active:scale-95"
              >
                Connect
              </button>
            ) : l.state === "linking" ? (
              <span className="text-sm text-accent">Connecting…</span>
            ) : l.state === "linked" ? (
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs text-accent">Linked</span>
            ) : (
              <span className="rounded-full bg-surface-strong px-2.5 py-1 text-xs text-muted">Claimed</span>
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 rounded-xl bg-page px-4 py-3.5">
        <span className="flex items-center justify-between text-sm">
          <span className="text-ink">Proof strength</span>
          <span className="text-muted">{github.state === "linked" ? "Solid" : "Light"}</span>
        </span>
        <span className="h-2 overflow-hidden rounded-full bg-surface-strong">
          <span className="block h-full rounded-full bg-accent transition-[width] duration-700 ease-out" style={{ width: `${strength}%` }} />
        </span>
        <small className="text-muted">
          {github.state === "linked" ? "Signing in with GitHub proved it's yours. That counts way more than a typed link." : "Typed links count a little. Hit Connect."}
        </small>
      </div>
    </div>
  );
}

type Project = { name: string; stack: string; live: "no" | "adding" | "yes" };

const MORE_PROJECTS: Project[] = [
  { name: "Portfolio site", stack: "Astro · Tailwind", live: "yes" },
  { name: "Discord study bot", stack: "Python · discord.py", live: "no" },
  { name: "Budget tracker", stack: "React Native · SQLite", live: "no" },
];
const PROJECT_CAP = 5;

function ProjectsMock() {
  const [projects, setProjects] = useState<Project[]>([
    { name: "Realtime whiteboard", stack: "Next.js · WebSockets", live: "yes" },
    { name: "Rust file renamer", stack: "Rust · CLI", live: "no" },
  ]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  function addLive(name: string) {
    const set = (live: Project["live"]) => setProjects((ps) => ps.map((p) => (p.name === name ? { ...p, live } : p)));
    set("adding");
    timers.current.push(setTimeout(() => set("yes"), 900));
  }
  function addProject() {
    const next = MORE_PROJECTS[projects.length - 2];
    if (next) setProjects((ps) => [...ps, next]);
  }
  const full = projects.length >= PROJECT_CAP;

  const chip = (label: string) => (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs text-accent">✓ {label}</span>
  );
  return (
    <div className="flex flex-col gap-2.5">
      <ul className="flex max-h-[268px] flex-col gap-2.5 overflow-y-auto">
        {projects.map((p) => (
          <motion.li
            key={p.name}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline px-4 py-3.5"
          >
            <span className="flex flex-col gap-0.5">
              <span className="text-[15px] text-ink">{p.name}</span>
              <small className="text-muted">{p.stack}</small>
            </span>
            <span className="flex items-center gap-1.5">
              {chip("Repo")}
              {p.live === "yes" ? (
                chip("Live")
              ) : (
                <button
                  type="button"
                  onClick={() => addLive(p.name)}
                  disabled={p.live === "adding"}
                  className="inline-flex h-7 items-center gap-1.5 rounded-full border border-dashed border-accent px-2.5 text-xs text-accent transition-colors hover:bg-accent-soft"
                >
                  {p.live === "adding" ? <StatusMark status="running" size={14} color="var(--accent)" /> : "+"} Add live link
                </button>
              )}
            </span>
          </motion.li>
        ))}
      </ul>
      <button
        type="button"
        onClick={addProject}
        disabled={full}
        className="flex items-center justify-between rounded-xl border border-dashed border-border-strong px-4 py-3.5 text-left text-[15px] text-body transition-colors enabled:hover:border-accent enabled:hover:text-accent disabled:cursor-default"
      >
        {full ? "That's the cap. Quality over quantity." : "+ Add another project"}
        <span className="text-sm tabular-nums text-muted">
          {projects.length} of {PROJECT_CAP}
        </span>
      </button>
      <small className="text-muted">A repo plus a live link is the strongest receipt a project can have.</small>
    </div>
  );
}

function PlacedMock() {
  const [fire, setFire] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setFire(1), 350);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="relative flex flex-col items-center gap-5 py-4 text-center">
      <SparkBurst fire={fire} at={{ x: 0.5, y: 0.34 }} colorVar="--accent" count={12} radius={70} size={16} />
      <span className="text-sm text-accent">Placement complete</span>
      <RollingNumber prefix="#" value={1284} from={4812} digits={4} className="text-[clamp(3.5rem,9vw,5.5rem)] tracking-[-0.05em] text-ink" />
      <span className="flex items-center gap-3 text-body">
        <TierEmblem tier="C" size="md" />
        C tier, ranks 1,001 to 5,000
      </span>
      <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
        <ActionLink href="/sign-up" size="md" arrow>
          Get placed for real
        </ActionLink>
        <TextLink href="/leaderboard" className="text-ink">
          See the leaderboard
        </TextLink>
      </div>
    </div>
  );
}
