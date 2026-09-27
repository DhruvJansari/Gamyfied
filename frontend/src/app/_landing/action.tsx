"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

// Every call to action on the landing page goes through here, so they all share one set of
// behaviours: a sheen on hover (primary tones), an arrow that nudges forward, a press that
// gives a little, and a visible focus ring. Hash links scroll smoothly to their section.

export function scrollToHash(e: MouseEvent<HTMLAnchorElement>, hash: string) {
  const el = document.getElementById(hash.slice(1));
  if (!el) return;
  e.preventDefault();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  window.history.replaceState(null, "", hash);
}

export function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`size-4 shrink-0 ${className}`}>
      <path d="M4 10h11M11 5.5 15.5 10 11 14.5" />
    </svg>
  );
}

const TONES = {
  primary: "cta-sheen bg-primary text-on-primary shadow-[0_1px_0_0_rgb(255_255_255/0.12)_inset,0_8px_24px_-12px_var(--accent)] hover:bg-primary-active [--sheen:var(--on-primary)]",
  secondary: "border border-hairline bg-canvas text-ink hover:border-border-strong hover:bg-surface-soft",
  light: "cta-sheen bg-on-dark text-on-pastel shadow-[0_10px_30px_-12px_rgb(0_0_0/0.45)] hover:bg-signature-paper [--sheen:var(--signature-blue)]",
  "outline-light": "border border-on-dark/30 text-on-dark hover:border-on-dark/70 hover:bg-on-dark/10",
  "on-pastel": "cta-sheen bg-on-pastel text-signature-paper hover:bg-signature-navy [--sheen:var(--signature-paper)]",
} as const;

export type ActionTone = keyof typeof TONES;

export function ActionLink({
  href,
  tone = "primary",
  size = "lg",
  arrow = false,
  className = "",
  children,
}: {
  href: string;
  tone?: ActionTone;
  size?: "md" | "lg";
  arrow?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const cls = `group inline-flex items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap no-underline transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none motion-reduce:active:scale-100 ${
    size === "lg" ? "h-12 px-6 text-base" : "h-10 px-4 text-sm"
  } ${TONES[tone]} ${className}`;
  const content = (
    <>
      {children}
      {arrow ? <ArrowIcon className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" /> : null}
    </>
  );

  if (href.startsWith("#")) {
    return (
      <a href={href} onClick={(e) => scrollToHash(e, href)} className={cls}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {content}
    </Link>
  );
}

/** An inline text link with an arrow, for "see more" moments inside a section. */
export function TextLink({ href, arrow = true, className = "", children }: { href: string; arrow?: boolean; className?: string; children: ReactNode }) {
  const cls = `group inline-flex items-center gap-1.5 font-medium no-underline underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${className}`;
  const content = (
    <>
      {children}
      {arrow ? <ArrowIcon className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" /> : null}
    </>
  );
  if (href.startsWith("#")) {
    return (
      <a href={href} onClick={(e) => scrollToHash(e, href)} className={cls}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {content}
    </Link>
  );
}
