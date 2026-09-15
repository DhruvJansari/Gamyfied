import type { Metadata } from "next";

import { OnboardingWelcome } from "./onboarding-welcome";

export const metadata: Metadata = { title: "Welcome" };

// Phase 1 step 3 (Context.md §5.3) builds the questionnaire here. For now it confirms the
// account exists and shows the permanent ID, which is the thing worth seeing first.
export default function OnboardingPage() {
  return (
    <main className="flex flex-1 justify-center px-4 py-12 md:py-20">
      <div className="w-full max-w-[540px]">
        <OnboardingWelcome />
      </div>
    </main>
  );
}
