"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/api/query-keys";
import { onboardingService, type Onboarding } from "@/services/onboarding";
import { participationsService, type ParticipationInput } from "@/services/participations";
import { profilesService, type OwnerProfile, type UpdateProfileInput } from "@/services/profiles";
import { projectsService, type ProjectInput } from "@/services/projects";
import { socialLinksService } from "@/services/social-links";
import { usersService, type Me, type UpdateMeInput } from "@/services/users";

// Every mutation on the profile page ends the same way: the server has already recomputed the
// score and dropped its cache, so we refetch the one owner query and everything (score,
// placement, sections) updates together. Two requests per action, never more.

export function useMyProfile() {
  return useQuery<OwnerProfile>({
    queryKey: queryKeys.profile.me,
    queryFn: () => profilesService.getMyProfile(),
    staleTime: 60 * 1000,
  });
}

function useRefreshMyProfile() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.profile.me });
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => profilesService.updateMyProfile(input),
    // The PUT returns the whole owner view, so no refetch is needed here.
    onSuccess: (profile) => queryClient.setQueryData(queryKeys.profile.me, profile),
  });
}

export function useUpdateMe() {
  const queryClient = useQueryClient();
  const refresh = useRefreshMyProfile();
  return useMutation({
    mutationFn: (input: UpdateMeInput) => usersService.updateMe(input),
    onSuccess: (me) => {
      queryClient.setQueryData<Me | null>(queryKeys.me, me);
      return refresh();
    },
  });
}

/**
 * The stack is onboarding data (it seeds category placement), so editing it re-submits the
 * questionnaire with the goal and categories unchanged.
 */
export function useUpdateStack() {
  const queryClient = useQueryClient();
  const refresh = useRefreshMyProfile();
  return useMutation({
    mutationFn: ({ current, stack }: { current: Onboarding; stack: string[] }) =>
      onboardingService.submitOnboarding({ stack, goal: current.goal, categories: current.categories }),
    onSuccess: (onboarding) => {
      queryClient.setQueryData<Me | null>(queryKeys.me, (me) => (me ? { ...me, onboarding, onboardedAt: onboarding.completedAt } : me));
      return refresh();
    },
  });
}

export function useAddSocialLink() {
  const refresh = useRefreshMyProfile();
  return useMutation({ mutationFn: (url: string) => socialLinksService.addSocialLink(url), onSuccess: refresh });
}

export function useRemoveSocialLink() {
  const refresh = useRefreshMyProfile();
  return useMutation({ mutationFn: (id: string) => socialLinksService.removeSocialLink(id), onSuccess: refresh });
}

export function useCreateProject() {
  const refresh = useRefreshMyProfile();
  return useMutation({ mutationFn: (input: ProjectInput) => projectsService.createProject(input), onSuccess: refresh });
}

export function useUpdateProject() {
  const refresh = useRefreshMyProfile();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ProjectInput> }) => projectsService.updateProject(id, input),
    onSuccess: refresh,
  });
}

export function useRemoveProject() {
  const refresh = useRefreshMyProfile();
  return useMutation({ mutationFn: (id: string) => projectsService.removeProject(id), onSuccess: refresh });
}

export function useVerifyProject() {
  const refresh = useRefreshMyProfile();
  return useMutation({ mutationFn: (id: string) => projectsService.requestVerification(id), onSuccess: refresh });
}

export function useCreateParticipation() {
  const refresh = useRefreshMyProfile();
  return useMutation({ mutationFn: (input: ParticipationInput) => participationsService.createParticipation(input), onSuccess: refresh });
}

export function useUpdateParticipation() {
  const refresh = useRefreshMyProfile();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ParticipationInput> }) => participationsService.updateParticipation(id, input),
    onSuccess: refresh,
  });
}

export function useRemoveParticipation() {
  const refresh = useRefreshMyProfile();
  return useMutation({ mutationFn: (id: string) => participationsService.removeParticipation(id), onSuccess: refresh });
}

export function useVerifyParticipation() {
  const refresh = useRefreshMyProfile();
  return useMutation({ mutationFn: (id: string) => participationsService.requestVerification(id), onSuccess: refresh });
}
