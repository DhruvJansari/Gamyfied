import Link from "next/link";

export default function ProfileNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-8 md:py-12">
      <h1>No one here by that handle</h1>
      <p>The profile may have moved to a new handle, or it never existed.</p>
      <Link href="/leaderboard" className="text-ink underline underline-offset-4">
        Browse the leaderboard
      </Link>
    </main>
  );
}
