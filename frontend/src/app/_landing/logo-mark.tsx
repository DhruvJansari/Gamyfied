// The StandByDev mark: three steps up, the top one lit. It is the product in one glyph
// (standing that climbs), so it appears in the header, on the standing card and the footer.

export function LogoMark({ className = "", lit = "fill-accent", base = "fill-current" }: { className?: string; lit?: string; base?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <rect x="2.5" y="13" width="5" height="8.5" rx="1.6" className={base} />
      <rect x="9.5" y="8" width="5" height="13.5" rx="1.6" className={base} />
      <rect x="16.5" y="2.5" width="5" height="19" rx="1.6" className={lit} />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className="size-5" />
      <span className="text-[17px] tracking-[-0.02em]">StandByDev</span>
    </span>
  );
}
