import type { Metadata } from "next";

import { OnboardingFlow } from "./onboarding-flow";

export const metadata: Metadata = { title: "Welcome" };

// Phase 1 step 3 (Context.md §5.3): the questionnaire that seeds category placement.
// Guests are redirected by proxy.ts; onboarded users by the flow.
export default function OnboardingPage() {
  return (
    <main className="flex flex-1 items-start justify-center px-4 py-10 md:py-16">
      <section className="w-full max-w-150 rounded-lg border border-hairline bg-surface-soft p-6 md:p-10">
        <OnboardingFlow />
      </section>
    </main>
  );
}
