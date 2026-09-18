"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useMe } from "@/hooks/use-auth";
import { isApiError } from "@/lib/api/errors";
import { messageFor } from "@/lib/messages";
import { OnboardingForm } from "./onboarding-form";

/** Loads the account, bounces anyone already onboarded, then hands over to the questionnaire. */
export function OnboardingFlow() {
  const router = useRouter();
  const me = useMe();

  const isOnboarded = me.data?.onboardedAt != null;
  useEffect(() => {
    if (isOnboarded) router.replace("/profile");
  }, [isOnboarded, router]);

  if (me.isPending || isOnboarded) {
    return (
      // Mirrors the form's first step: progress bar, heading, copy, tag input, suggestion chips, footer.
      <div aria-busy className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <div className="h-4 w-28 animate-pulse rounded-sm bg-surface-strong" />
          <div className="h-1 w-full animate-pulse rounded-pill bg-surface-strong" />
        </div>
        <div className="flex flex-col gap-3">
          <div className="h-8 w-3/4 animate-pulse rounded-sm bg-surface-strong" />
          <div className="h-5 w-full animate-pulse rounded-sm bg-surface-strong" />
        </div>
        <div className="h-14 w-full animate-pulse rounded-md bg-surface-strong" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-10 w-24 animate-pulse rounded-pill bg-surface-strong" />
          ))}
        </div>
        <div className="flex justify-end border-t border-hairline pt-6">
          <div className="h-12 w-28 animate-pulse rounded-lg bg-surface-strong" />
        </div>
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

  return <OnboardingForm />;
}
