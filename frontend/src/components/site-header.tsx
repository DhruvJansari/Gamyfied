"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useLogout, useMe } from "@/hooks/use-auth";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/community", label: "Community" },
];

export function SiteHeader() {
  const me = useMe();
  const logout = useLogout();
  const router = useRouter();
  const pathname = usePathname();

  // The landing page renders its own header (app/_landing/landing-header.tsx).
  if (pathname === "/") return null;

  return (
    <header className="flex items-center justify-between gap-4 px-6 py-4 md:px-10">
      <Link href="/" className="text-ink text-lg tracking-tight no-underline">
        StandByDev
      </Link>

      <nav aria-label="Primary" className="hidden items-center gap-1 rounded-lg border border-hairline bg-surface-soft px-2 py-1 md:flex">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-md px-4 py-2 text-body no-underline hover:bg-surface-strong">
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex min-w-24 items-center justify-end gap-3">
        {me.isPending ? (
          // Skeleton matches the signed-in state's dimensions so nothing shifts.
          <div aria-hidden className="h-10 w-24 animate-pulse rounded-lg bg-surface-strong" />
        ) : me.data ? (
          <>
            <Link href="/profile" className="hidden rounded-md px-3 py-2 text-body no-underline hover:bg-surface-soft sm:inline">
              {me.data.displayName}
            </Link>
            <button
              type="button"
              disabled={logout.isPending}
              onClick={() =>
                logout.mutate(undefined, {
                  onSettled: () => router.replace("/"),
                })
              }
              className="rounded-lg border border-hairline px-4 py-2 text-ink hover:bg-surface-soft disabled:opacity-60"
            >
              {logout.isPending ? "Signing out…" : "Sign out"}
            </button>
          </>
        ) : (
          <Link href="/sign-in" className="rounded-lg bg-primary px-5 py-2 text-on-primary no-underline active:bg-primary-active">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
