import type { TierLetter } from "@/services/leaderboard";

// One mark per tier, so a row reads at a glance without a word. Each is a rounded plate in
// the tier's palette colour (DESIGN.md signature pastels for
// S–C, neutral surfaces for D–E) carrying a simple glyph:
//
//   S Legend      crown
//   A Champion    star
//   B Vanguard    shield with a chevron
//   C Challenger  lightning bolt
//   D Rookie      single chevron up
//   E Recruit     a spark
//
// The filter rail shows every emblem next to its name, which is the legend.

const PLATE: Record<TierLetter, string> = {
  S: "fill-signature-yellow",
  A: "fill-signature-mint",
  B: "fill-signature-peach",
  C: "fill-signature-cream",
  D: "fill-surface-strong",
  E: "fill-surface-strong",
};

const GLYPH: Record<TierLetter, string> = {
  S: "stroke-on-pastel fill-on-pastel",
  A: "stroke-on-pastel fill-on-pastel",
  B: "stroke-on-pastel fill-none",
  C: "stroke-on-pastel fill-on-pastel",
  D: "stroke-ink fill-none",
  E: "stroke-muted fill-muted",
};

const SIZE = { sm: 28, md: 36, lg: 48 } as const;

export function TierEmblem({ tier, name, size = "sm", className = "" }: { tier: TierLetter; name?: string; size?: keyof typeof SIZE; className?: string }) {
  const px = SIZE[size];
  return (
    <svg
      viewBox="0 0 32 32"
      width={px}
      height={px}
      role="img"
      aria-label={name ? `${name} tier` : `Tier ${tier}`}
      className={`shrink-0 ${className}`}
    >
      <rect x="1.5" y="1.5" width="29" height="29" rx="8" className={PLATE[tier]} />
      <g strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={GLYPH[tier]}>
        {tier === "S" ? <path d="M8 21.5h16l1.5-10-5 4L16 9l-4.5 6.5-5-4z" /> : null}
        {tier === "A" ? <path d="M16 8l2.4 5.2 5.6.6-4.2 3.9 1.2 5.6L16 20.5l-5 2.8 1.2-5.6L8 13.8l5.6-.6z" /> : null}
        {tier === "B" ? (
          <>
            <path d="M16 7.5l8 3v7c0 5-3.5 8.5-8 10.5-4.5-2-8-5.5-8-10.5v-7z" />
            <path d="M12 17.5l4-4 4 4" />
          </>
        ) : null}
        {tier === "C" ? <path d="M17.5 7.5L10 18h5l-1 6.5L22 14h-5z" /> : null}
        {tier === "D" ? <path d="M10 19l6-6 6 6" /> : null}
        {tier === "E" ? (
          <>
            <circle cx="16" cy="16" r="2.2" />
            <path d="M16 8v3M16 21v3M8 16h3M21 16h3" className="fill-none" />
          </>
        ) : null}
      </g>
    </svg>
  );
}
