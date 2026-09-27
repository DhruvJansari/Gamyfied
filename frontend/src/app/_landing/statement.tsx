"use client";

import { useEffect, useRef, type ReactNode } from "react";

// What StandByDev is, in two sentences, lit word by word as you scroll (after React Bits'
// ScrollReveal, rewritten without GSAP: one passive scroll listener, styles set directly,
// no re-renders). Inline chips name the places your work lives today. Reduced motion and
// no-JS visitors get the full text at once (see .scroll-word in globals.css).

type Chip = { chip: string; icon: "branch" | "code" | "link"; after: string };
type Token = { text: string } | Chip | { accent: string; tone: "blue" | "yellow" };

function parse(copy: string): Token[] {
  const out: Token[] = [];
  for (const part of copy.split(/(\[[^\]]+\]|\{[^}]+\})/)) {
    if (!part) continue;
    if (part.startsWith("[")) {
      const [label, icon] = part.slice(1, -1).split("|");
      out.push({ chip: label!, icon: icon as Chip["icon"], after: "" });
    } else if (part.startsWith("{")) {
      const [word, tone] = part.slice(1, -1).split("|");
      out.push({ accent: word!, tone: tone as "blue" | "yellow" });
    } else {
      for (const w of part.split(/\s+/)) {
        if (!w) continue;
        // Punctuation right after a chip rides with it, so a line never starts with "."
        const prev = out[out.length - 1];
        if (/^[.,:]+$/.test(w) && prev && "chip" in prev) prev.after += w;
        else out.push({ text: w });
      }
    }
  }
  return out;
}

const PROBLEM = parse("Your code lives on [GitHub|branch]. Your grind lives on [LeetCode|code]. Your best project lives at [a link nobody opens|link].");
const ANSWER = parse("StandByDev turns it into one standing anyone gets instantly: a {score|blue}, a {rank|blue} and a {tier.|yellow} Proof over hype.");

const ICONS: Record<"branch" | "code" | "link", ReactNode> = {
  branch: <path d="M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 0c0 5-6 3-12 6M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />,
  code: <path d="m8 7-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16" />,
  link: <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />,
};

function Words({ tokens, strong }: { tokens: Token[]; strong: boolean }) {
  return (
    <>
      {tokens.map((t, i) => {
        const glue = "text" in t && /^[.,:]/.test(t.text);
        const space = i > 0 && !glue ? " " : "";
        if ("chip" in t) {
          return (
            <span key={i}>
              {space}
              <span className="whitespace-nowrap">
                <span data-w className="scroll-word mx-[0.08em] inline-flex translate-y-[-0.08em] items-center gap-[0.3em] rounded-full bg-on-dark/10 px-[0.45em] py-[0.12em] align-middle text-[0.72em] leading-none text-on-dark ring-1 ring-on-dark/20">
                  <svg viewBox="0 0 24 24" aria-hidden className="size-[0.9em] fill-none stroke-signature-blue-bright" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {ICONS[t.icon]}
                  </svg>
                  {t.chip}
                </span>
                {t.after ? (
                  <span data-w className="scroll-word text-on-dark/85">
                    {t.after}
                  </span>
                ) : null}
              </span>
            </span>
          );
        }
        if ("accent" in t) {
          return (
            <span key={i}>
              {space}
              <span data-w className={`scroll-word ${t.tone === "blue" ? "text-signature-blue-bright" : "text-signature-yellow"}`}>
                {t.accent}
              </span>
            </span>
          );
        }
        return (
          <span key={i}>
            {space}
            <span data-w className={`scroll-word ${strong ? "text-on-dark" : "text-on-dark/85"}`}>
              {t.text}
            </span>
          </span>
        );
      })}
    </>
  );
}

export function Statement() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const words = Array.from(el.querySelectorAll<HTMLElement>("[data-w]"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      words.forEach((w) => (w.style.opacity = "1"));
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (vh * 0.4 + r.height * 0.75)));
      const lit = p * words.length;
      words.forEach((w, i) => {
        w.style.opacity = String(0.18 + 0.82 * Math.min(1, Math.max(0, lit - i)));
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section aria-label="What StandByDev is" className="texture-grain bg-signature-navy text-on-dark">
      <div className="mx-auto max-w-7xl px-5 py-28 md:px-10 md:py-40">
        <div ref={ref} className="flex max-w-5xl flex-col gap-10 text-[clamp(1.75rem,4.1vw,3.6rem)] leading-[1.14] tracking-[-0.03em]">
          <p className="text-[length:inherit] leading-[inherit]">
            <Words tokens={PROBLEM} strong={false} />
          </p>
          <p className="text-[length:inherit] leading-[inherit]">
            <Words tokens={ANSWER} strong />
          </p>
        </div>
      </div>
    </section>
  );
}
