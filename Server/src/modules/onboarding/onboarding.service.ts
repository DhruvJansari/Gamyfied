import { usersService } from "../users/users.service";
import { toOnboardingDto, type OnboardingDto } from "./onboarding.dto";
import { onboardingRepository } from "./onboarding.repository";
import type { SubmitOnboardingInput } from "./onboarding.schemas";

export const onboardingService = {
  async submit(userId: string, input: SubmitOnboardingInput): Promise<OnboardingDto> {
    const row = await onboardingRepository.upsertByUserId(userId, input);
    // `/users/me` carries the answers, so its cache is stale the moment they change.
    await usersService.invalidateMe(userId);
    return toOnboardingDto(row);
  },
};
