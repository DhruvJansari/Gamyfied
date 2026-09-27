"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useLogout, useMe } from "@/hooks/use-auth";

import { ActionLink, scrollToHash } from "./action";
import { Wordmark } from "./logo-mark";

// The landing page's own header (the app's SiteHeader steps aside on "/"). Transparent over
// the hero, frosted once you scroll. A pill slides under whichever link you point at and
// otherwise rests on the section you are reading. Phones get a full-height menu sheet.

const NAV = [
  { href: "#how", label: "How it works" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "#clans", label: "Clans" },
  { href: "#community", label: "Community" },
];
const SECTIONS = NAV.filter((n) => n.href.startsWith("#")).map((n) => n.href.slice(1));

export function LandingHeader() {
  const me = useMe();
  const logout = useLogout();
  const router = useRouter();

  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll spy: whichever section spans the middle of the viewport is the active one; none
  // when you are between them (hero, footer). Recomputed from positions, so jumps are fine.
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const mid = window.innerHeight / 2;
      let next: string | null = null;
      for (const id of SECTIONS) {
        const r = document.getElementById(id)?.getBoundingClientRect();
        if (r && r.top <= mid && r.bottom >= mid) next = `#${id}`;
      }
      setActive(next);
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

  const target = hovered ?? active;
  useLayoutEffect(() => {
    const pill = pillRef.current;
    const el = target ? itemRefs.current[target] : null;
    if (!pill) return;
    if (!el) {
      pill.style.opacity = "0";
      return;
    }
    pill.style.opacity = "1";
    pill.style.transform = `translateX(${el.offsetLeft}px)`;
    pill.style.width = `${el.offsetWidth}px`;
  }, [target]);

  // The sheet owns the screen while open: no page scroll behind it, Escape closes it.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const signedIn = !!me.data;

  // The sheet is a sibling of the header, not a child: the header's backdrop blur would make
  // it the containing block for anything position:fixed inside it.
  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
          open ? "border-b border-hairline bg-page" : scrolled ? "border-b border-hairline bg-page/80 backdrop-blur-xl" : "border-b border-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 md:h-18 md:px-10">
          <Link
            href="/"
            aria-label="StandByDev home"
            className="rounded-md text-ink no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            onClick={(e) => {
              if (window.scrollY > 0) {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
              }
            }}
          >
            <Wordmark />
          </Link>

          <nav aria-label="Primary" className="relative hidden items-center md:flex" onMouseLeave={() => setHovered(null)}>
            <span
              ref={pillRef}
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 rounded-lg bg-surface-strong/80 opacity-0 transition-[transform,width,opacity] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
            />
            {NAV.map((item) => {
              const isActive = active === item.href;
              const cls = `relative z-10 rounded-lg px-4 py-2 text-[15px] no-underline transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-accent ${
                isActive ? "text-ink" : "text-body hover:text-ink"
              }`;
              return item.href.startsWith("#") ? (
                <a
                  key={item.href}
                  ref={(el) => {
                    itemRefs.current[item.href] = el;
                  }}
                  href={item.href}
                  aria-current={isActive ? "location" : undefined}
                  onMouseEnter={() => setHovered(item.href)}
                  onFocus={() => setHovered(item.href)}
                  onBlur={() => setHovered(null)}
                  onClick={(e) => scrollToHash(e, item.href)}
                  className={cls}
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={item.href}
                  ref={(el) => {
                    itemRefs.current[item.href] = el;
                  }}
                  href={item.href}
                  onMouseEnter={() => setHovered(item.href)}
                  onFocus={() => setHovered(item.href)}
                  onBlur={() => setHovered(null)}
                  className={cls}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {me.isPending ? (
              // Same footprint as the guest buttons, so nothing shifts when the session resolves.
              <div aria-hidden className="h-10 w-36 animate-pulse rounded-xl bg-surface-strong sm:w-52" />
            ) : signedIn ? (
              <>
                <button
                  type="button"
                  disabled={logout.isPending}
                  onClick={() => logout.mutate(undefined, { onSettled: () => router.replace("/") })}
                  className="hidden h-10 rounded-xl px-4 text-[15px] text-body transition-colors hover:bg-surface-strong/70 hover:text-ink disabled:opacity-60 sm:inline-flex sm:items-center"
                >
                  {logout.isPending ? "Signing out…" : "Sign out"}
                </button>
                <ActionLink href="/profile" size="md" arrow>
                  Your profile
                </ActionLink>
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="hidden h-10 items-center rounded-xl px-4 text-[15px] text-body no-underline transition-colors hover:bg-surface-strong/70 hover:text-ink focus-visible:outline-2 focus-visible:outline-accent sm:inline-flex"
                >
                  Sign in
                </Link>
                <ActionLink href="/sign-up" size="md">
                  Join StandByDev
                </ActionLink>
              </>
            )}

            <button
              ref={menuButton}
              type="button"
              aria-expanded={open}
              aria-controls="landing-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((o) => !o)}
              className="relative ml-1 inline-flex size-10 items-center justify-center rounded-xl text-ink transition-colors hover:bg-surface-strong/70 md:hidden"
            >
              <span
                aria-hidden
                className={`absolute h-[1.5px] w-5 rounded-full bg-current transition-transform duration-300 ${open ? "rotate-45" : "-translate-y-1"}`}
              />
              <span
                aria-hidden
                className={`absolute h-[1.5px] w-5 rounded-full bg-current transition-transform duration-300 ${open ? "-rotate-45" : "translate-y-1"}`}
              />
            </button>
          </div>
        </div>
      </header>

      <div
        id="landing-menu"
        data-open={open ? "" : undefined}
        inert={!open}
        className="invisible fixed inset-x-0 top-16 bottom-0 z-40 flex flex-col justify-between bg-page px-5 pt-6 pb-8 opacity-0 transition-[opacity,visibility] duration-300 data-open:visible data-open:opacity-100 md:hidden"
      >
        <nav aria-label="Menu" className="flex flex-col">
          {NAV.map((item, i) => {
            const cls = `flex items-center justify-between border-b border-hairline py-5 text-3xl tracking-[-0.03em] text-ink no-underline transition-[opacity,transform] duration-500 active:text-accent ${
              open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`;
            const style = { transitionDelay: open ? `${60 + i * 40}ms` : "0ms" };
            const arrow = (
              <span aria-hidden className="text-xl text-muted">
                ↗
              </span>
            );
            return item.href.startsWith("#") ? (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  setOpen(false);
                  scrollToHash(e, item.href);
                }}
                style={style}
                className={cls}
              >
                {item.label}
                {arrow}
              </a>
            ) : (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} style={style} className={cls}>
                {item.label}
                {arrow}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col gap-3">
          {signedIn ? (
            <ActionLink href="/profile" arrow>
              Your profile
            </ActionLink>
          ) : (
            <>
              <ActionLink href="/sign-up" arrow>
                Join StandByDev
              </ActionLink>
              <ActionLink href="/sign-in" tone="secondary">
                Sign in
              </ActionLink>
            </>
          )}
        </div>
      </div>
    </>
  );
}
