import { request } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { Onboarding } from "./onboarding";

export type Role = "USER" | "MODERATOR" | "ADMIN";

export type Me = {
  id: string;
  /** Permanent, e.g. "#7K2M9QX". */
  publicId: string;
  email: string;
  isEmailVerified: boolean;
  phone: string | null;
  isPhoneVerified: boolean;
  displayName: string;
  handle: string;
  role: Role;
  createdAt: string;
  /** Null until the questionnaire is submitted. `/onboarding` gates on this. */
  onboardedAt: string | null;
  onboarding: Onboarding | null;
};

export const usersService = {
  getMe(): Promise<Me> {
    return request({ method: "GET", url: endpoints.users.me });
  },
};
