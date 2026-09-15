"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { hasSessionMarker } from "@/lib/api/client";
import { ErrorCode, isApiError } from "@/lib/api/errors";
import { queryKeys } from "@/lib/api/query-keys";
import { authService, type SendOtpInput, type VerifyOtpInput } from "@/services/auth";
import { usersService, type Me } from "@/services/users";

/**
 * The signed-in user, or null for guests. Cached for 5 minutes and never refetched on
 * window focus, so tab switching costs no requests. A guest (no session marker) resolves
 * to null without ever calling the API.
 */
export function useMe() {
  return useQuery<Me | null>({
    queryKey: queryKeys.me,
    queryFn: async () => {
      if (!hasSessionMarker()) return null;
      try {
        return await usersService.getMe();
      } catch (err) {
        if (isApiError(err) && (err.code === ErrorCode.UNAUTHENTICATED || err.code === ErrorCode.REFRESH_INVALID)) {
          return null;
        }
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useSendOtp() {
  return useMutation({ mutationFn: (input: SendOtpInput) => authService.sendOtp(input) });
}

export function useVerifyOtp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VerifyOtpInput) => authService.verifyOtp(input),
    onSuccess: ({ user }) => {
      queryClient.setQueryData(queryKeys.me, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      // Whatever the server said, this browser is signed out: drop everything cached.
      queryClient.clear();
    },
  });
}
