// The rank cell. The top three carry a winged shield in gold, silver and bronze — the board's
// one piece of ceremony — everyone else a plain number. Colours are palette tokens (DESIGN.md):
// gold from the yellow/mustard pair, bronze from peach/coral, silver from the neutral surfaces.

const EMBLEM = {
  1: { wing: "fill-signature-mustard", shield: "fill-signature-yellow stroke-signature-mustard", num: "fill-on-pastel" },
  2: { wing: "fill-border-strong", shield: "fill-surface-strong stroke-border-strong", num: "fill-ink" },
  3: { wing: "fill-signature-coral", shield: "fill-signature-peach stroke-signature-coral", num: "fill-on-pastel" },
} as const;

type Medal = keyof typeof EMBLEM;

const isMedal = (rank: number): rank is Medal => rank === 1 || rank === 2 || rank === 3;

export function RankEmblem({ rank, size = "md" }: { rank: number; size?: "md" | "lg" }) {
  if (!isMedal(rank)) {
    return <span className={`tabular-nums text-ink ${size === "lg" ? "text-2xl" : "text-lg"}`}>{rank.toLocaleString()}</span>;
  }
  const c = EMBLEM[rank];
  const px = size === "lg" ? 56 : 44;
  return (
    <svg viewBox="0 0 48 44" width={px} height={(px * 44) / 48} role="img" aria-label={`Rank ${rank}`} className="shrink-0 overflow-visible">
      {/* Wings: three swept feathers a side. */}
      <g className={c.wing}>
        <path d="M15 20C9 13 4 12 1 14c4 2 7 4 9 8z" />
        <path d="M14 25c-6-4-11-4-14-1 4 1 8 3 11 6z" />
        <path d="M15 30c-5-2-9-1-12 3 4 0 7 1 10 3z" />
        <path d="M33 20c6-7 11-8 14-6-4 2-7 4-9 8z" />
        <path d="M34 25c6-4 11-4 14-1-4 1-8 3-11 6z" />
        <path d="M33 30c5-2 9-1 12 3-4 0-7 1-10 3z" />
      </g>
      <path d="M24 3l11 5v14c0 8-5 14-11 18-6-4-11-10-11-18V8z" strokeWidth="1.5" className={c.shield} />
      <text x="24" y="29" textAnchor="middle" fontSize="17" fontWeight="500" className={c.num}>
        {rank}
      </text>
    </svg>
  );
}
