import Link from "next/link";

import { TextLink } from "./action";
import { Wordmark } from "./logo-mark";

// Only destinations that exist: the page's own sections and the real public pages.

const PRODUCT = [
  { href: "#how", label: "How it works" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "#clans", label: "Clans" },
  { href: "#community", label: "Community" },
];
const ACCOUNT = [
  { href: "/sign-up", label: "Join StandByDev" },
  { href: "/sign-in", label: "Sign in" },
];

export function LandingFooter() {
  return (
    <footer className="overflow-hidden bg-page">
      <div className="mx-auto flex max-w-7xl flex-col gap-14 px-5 pt-20 pb-8 md:px-10">
        <div className="flex flex-col justify-between gap-12 md:flex-row">
          <div className="flex max-w-sm flex-col gap-4">
            <Link href="/" className="w-fit text-ink no-underline">
              <Wordmark />
            </Link>
            <p className="text-base text-body">Where developers establish their standing.</p>
          </div>
          <div className="flex gap-16">
            <nav aria-label="Product" className="flex flex-col gap-3">
              <span className="text-sm text-muted">Product</span>
              {PRODUCT.map((l) => (
                <TextLink key={l.href} href={l.href} arrow={false} className="text-[15px] text-ink">
                  {l.label}
                </TextLink>
              ))}
            </nav>
            <nav aria-label="Account" className="flex flex-col gap-3">
              <span className="text-sm text-muted">Account</span>
              {ACCOUNT.map((l) => (
                <TextLink key={l.href} href={l.href} arrow={false} className="text-[15px] text-ink">
                  {l.label}
                </TextLink>
              ))}
            </nav>
          </div>
        </div>

        <p aria-hidden className="select-none pb-[0.14em] text-[clamp(3.5rem,16.5vw,15rem)] leading-[0.8] tracking-[-0.06em] text-ink/[0.07]">
          StandByDev
        </p>

        <div className="flex flex-col justify-between gap-2 border-t border-hairline pt-6 text-sm text-muted sm:flex-row">
          <span>© 2026 StandByDev</span>
          <span>Built for people who ship.</span>
        </div>
      </div>
    </footer>
  );
}
