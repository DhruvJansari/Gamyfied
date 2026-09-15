"use client";

import Link from "next/link";

import { useMe } from "@/hooks/use-auth";
import { isApiError } from "@/lib/api/errors";
import { messageFor } from "@/lib/messages";

export function OnboardingWelcome() {
  const me = useMe();

  if (me.isPending) {
    return (
      <div aria-busy className="flex flex-col gap-4">
        <div className="h-10 w-2/3 animate-pulse rounded-sm bg-surface-strong" />
        <div className="h-6 w-1/2 animate-pulse rounded-sm bg-surface-strong" />
        <div className="mt-4 h-28 w-full animate-pulse rounded-lg bg-surface-strong" />
      </div>
    );
  }

  if (me.isError) {
    return (
      <div className="flex flex-col gap-4">
        <h1>Couldn&apos;t load your account</h1>
        <p>{messageFor(isApiError(me.error) ? me.error.code : undefined)}</p>
        <button type="button" onClick={() => me.refetch()} className="h-12 w-fit rounded-lg bg-primary px-6 text-on-primary">
          Retry
        </button>
      </div>
    );
  }

  if (!me.data) {
    // The proxy should have redirected; if the session vanished mid-flight, be explicit.
    return (
      <div className="flex flex-col gap-4">
        <h1>You&apos;re signed out</h1>
        <p>
          <Link href="/sign-in" className="text-ink underline underline-offset-4">
            Sign in
          </Link>{" "}
          to continue setting up your account.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Welcome, {me.data.displayName}</h1>
        <p className="mt-2">Your account is ready. Onboarding questions come next; here is the one thing to remember.</p>
      </div>
      <div className="rounded-lg bg-signature-forest p-6 text-on-dark">
        <small className="opacity-80">Your permanent ID</small>
        <p className="mt-1 font-mono text-3xl tracking-wider">{me.data.publicId}</p>
        <small className="mt-3 block opacity-80">
          It never changes. Friends, clans and recruiters find you by it, even if you rename yourself.
        </small>
      </div>
      <p>
        Handle: <span className="text-ink">@{me.data.handle}</span> · Email: <span className="text-ink">{me.data.email}</span>
        {me.data.phone ? (
          <>
            {" "}
            · Phone: <span className="text-ink">{me.data.phone}</span>
            {me.data.isPhoneVerified ? "" : " (not verified yet)"}
          </>
        ) : null}
      </p>
      <Link href="/" className="h-12 w-fit rounded-lg bg-primary px-6 leading-12 text-on-primary no-underline active:bg-primary-active">
        Go to the leaderboard
      </Link>
    </div>
  );
}
