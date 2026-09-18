import type { Metadata } from "next";
import { Suspense } from "react";

import { ProfilePage } from "./profile-page";

export const metadata: Metadata = { title: "My profile" };

// The owner's profile is a primary destination, not a settings page: placement progress, the
// score and why it is what it is, and every editable section in one place. Guests are
// redirected by proxy.ts. The public view lives at /u/[handle].
export default function Page() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:py-8">
      {/* useSearchParams (the active tab) needs a Suspense boundary for static rendering. */}
      <Suspense>
        <ProfilePage />
      </Suspense>
    </main>
  );
}
