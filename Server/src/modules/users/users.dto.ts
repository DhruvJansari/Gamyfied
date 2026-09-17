import { toOnboardingDto, type OnboardingDto } from "../onboarding/onboarding.dto";
import type { Onboarding } from "../onboarding/onboarding.repository";
import type { User } from "./users.repository";

/** The shape of a user as the API exposes it. Never the raw row. */
export type MeDto = {
  id: string;
  publicId: string;
  email: string;
  isEmailVerified: boolean;
  phone: string | null;
  isPhoneVerified: boolean;
  displayName: string;
  handle: string;
  role: User["role"];
  createdAt: string;
  /** Null until the questionnaire is submitted; the client gates `/onboarding` on this. */
  onboardedAt: string | null;
  onboarding: OnboardingDto | null;
};

export function toMeDto(user: User, onboarding: Onboarding | null): MeDto {
  const onboardingDto = onboarding ? toOnboardingDto(onboarding) : null;
  return {
    id: user.id,
    publicId: `#${user.publicId}`,
    email: user.email,
    isEmailVerified: user.emailVerifiedAt !== null,
    phone: user.phone,
    isPhoneVerified: user.phoneVerifiedAt !== null,
    displayName: user.displayName,
    handle: user.handle,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    onboardedAt: onboardingDto?.completedAt ?? null,
    onboarding: onboardingDto,
  };
}
