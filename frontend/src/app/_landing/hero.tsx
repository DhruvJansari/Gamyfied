import Link from "next/link";

import { ActionLink, ArrowIcon } from "./action";
import { StandingCard } from "./standing-card";

// First screen. Three short lines carry the whole loop (build, prove, rank up) and the card
// on the right is the thing you walk away with. One quiet pool of blue light sits behind the
// card; no pattern, no mesh. The copy paints before hydration (CSS load-in, not JS).

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(48%_58%_at_76%_46%,var(--accent-soft)_0%,transparent_72%)]"
      />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-5 pt-8 pb-20 md:px-10 md:pt-14 lg:grid-cols-12 lg:gap-8 lg:pb-28">
        <div className="flex flex-col gap-8 lg:col-span-7">
          <div className="rise-in">
            <Link
              href="/leaderboard"
              className="group inline-flex items-center gap-2.5 rounded-full border border-hairline bg-canvas/70 py-1.5 pr-3 pl-2 text-sm text-body no-underline backdrop-blur transition-colors hover:border-border-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span className="relative flex size-5 items-center justify-center">
                <span aria-hidden className="live-ping absolute size-2 rounded-full bg-accent" />
                <span aria-hidden className="relative size-2 rounded-full bg-accent" />
              </span>
              Preseason is live
              <span aria-hidden className="h-3.5 w-px bg-hairline" />
              <span className="flex items-center gap-1 text-ink">
                See the board
                <ArrowIcon className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>

          {/* The one h1 runs at display size: the landing page is the single place the type
              scale goes past the app's h1, on purpose (project/Rules.md, Typography). */}
          <h1 id="hero-title" className="rise-in text-[clamp(3.4rem,8.4vw,7.25rem)] leading-[0.92] tracking-tighter" style={{ animationDelay: "80ms" }}>
            <span className="block">Build it.</span>
            <span className="block">Prove it.</span>
            <span className="shiny-text block pb-[0.06em] [--shiny-base:var(--accent)] [--shiny-light:color-mix(in_srgb,var(--accent)_30%,white)]">Rank up.</span>
          </h1>

          <p className="rise-in max-w-xl text-lg text-body md:text-xl md:leading-8" style={{ animationDelay: "160ms" }}>
            StandByDev is the ranked ladder for developers. Show what you&apos;ve shipped, back it with real proof, and see exactly where you
            stand against every other builder.
          </p>

          <div className="rise-in flex flex-col gap-5" style={{ animationDelay: "240ms" }}>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ActionLink href="/sign-up" arrow>
                Claim your spot
              </ActionLink>
              <ActionLink href="/leaderboard" tone="secondary">
                See the leaderboard
              </ActionLink>
            </div>
            <span className="flex items-center gap-2 text-sm text-muted">
              <svg viewBox="0 0 16 16" aria-hidden className="size-4 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="8" cy="8" r="6.25" />
                <path d="M8 4.75V8l2.25 1.5" />
              </svg>
              Placement takes under 30 minutes. Then you&apos;re on the board.
            </span>
          </div>
        </div>

        <div className="rise-in lg:col-span-5" style={{ animationDelay: "200ms" }}>
          <StandingCard />
        </div>
      </div>
    </section>
  );
}
