import { ActionLink } from "./action";
import { LogoMark } from "./logo-mark";
import { Reveal } from "./motion";

// The last word, on the page's one electric-blue band. Why people come back is said as a
// row of plain facts; the ones not built yet are marked.

const REASONS = [
  { text: "Your rank moves when you ship", soon: false },
  { text: "New projects keep counting", soon: false },
  { text: "Clan battles", soon: true },
  { text: "Seasons and festivals", soon: true },
  { text: "Challenges from other devs", soon: true },
];

export function Closer() {
  return (
    <section aria-labelledby="closer-title" className="texture-grain relative overflow-hidden bg-signature-blue text-on-dark">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 size-208 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(255_255_255/0.16)_0%,transparent_60%)]"
      />
      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-5 py-28 text-center md:px-10 md:py-36">
        <Reveal className="flex flex-col items-center gap-8">
          <LogoMark className="size-14" lit="fill-signature-yellow" base="fill-on-dark" />
          <h2 id="closer-title" className="max-w-[14ch] text-[clamp(2.6rem,6.4vw,5.5rem)] leading-[0.96] tracking-[-0.045em] text-on-dark">
            Your spot on the board is open.
          </h2>
          <p className="max-w-xl text-on-dark/85 md:text-xl md:leading-8">
            Placement takes under 30 minutes. After that, every project you ship can move your rank.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ActionLink href="/sign-up" tone="light" arrow>
              Claim your spot
            </ActionLink>
            <ActionLink href="/sign-in" tone="outline-light">
              I already have an account
            </ActionLink>
          </div>
        </Reveal>

        <Reveal delay={140} className="mt-16 flex flex-col items-center gap-4">
          <span className="text-sm text-on-dark/70">Why people keep coming back</span>
          <ul className="flex max-w-3xl flex-wrap justify-center gap-2">
            {REASONS.map((r) => (
              <li key={r.text} className="flex items-center gap-2 rounded-full bg-on-dark/10 px-4 py-2 text-sm text-on-dark ring-1 ring-on-dark/15">
                {r.text}
                {r.soon ? <span className="rounded-full bg-signature-yellow px-2 py-0.5 text-[11px] text-on-pastel">soon</span> : null}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
