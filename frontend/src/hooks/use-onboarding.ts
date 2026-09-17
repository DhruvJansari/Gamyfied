"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/api/query-keys";
import { onboardingService, type SubmitOnboardingInput } from "@/services/onboarding";
import type { Me } from "@/services/users";

export function useSubmitOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitOnboardingInput) => onboardingService.submitOnboarding(input),
    onSuccess: (onboarding) => {
      // The server already invalidated its cache; patch ours so the redirect guard sees it now.
      queryClient.setQueryData<Me | null>(queryKeys.me, (me) =>
        me ? { ...me, onboarding, onboardedAt: onboarding.completedAt } : me,
      );
    },
  });
}
