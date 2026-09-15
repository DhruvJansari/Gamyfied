import { request } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

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
};

export const usersService = {
  getMe(): Promise<Me> {
    return request({ method: "GET", url: endpoints.users.me });
  },
};
