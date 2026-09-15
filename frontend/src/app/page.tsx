import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-section text-center">
      <div className="flex max-w-2xl flex-col items-center gap-6">
        <h1>Your portfolio, verified. Your rank, earned.</h1>
        <p>
          Code your own profile page, add claims about your work, and let the agent check every one. Only what it can prove
          counts toward your place on the ladder — and S-tier is just twenty chairs.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/sign-up" className="flex h-12 items-center justify-center rounded-lg bg-primary px-6 text-on-primary no-underline active:bg-primary-active">
            Create an account
          </Link>
          <Link href="/leaderboard" className="flex h-12 items-center justify-center rounded-lg border border-hairline bg-canvas px-6 text-ink no-underline active:bg-surface-soft">
            Browse the leaderboard
          </Link>
        </div>
      </div>
    </main>
  );
}
