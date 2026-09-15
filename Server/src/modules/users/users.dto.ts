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
};

export function toMeDto(user: User): MeDto {
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
  };
}
