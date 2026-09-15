import { request } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { Me } from "./users";

// One function per endpoint, no logic (project/Rules.md, The services).

export type Channel = "email" | "phone";

export type SendOtpInput =
  | { channel: "email"; identifier: string; intent: "signin" }
  | { channel: "phone"; identifier: string; intent: "signin" }
  | { channel: "email"; identifier: string; intent: "signup"; profile: { displayName: string; phone?: string } }
  | { channel: "phone"; identifier: string; intent: "signup"; profile: { displayName: string; email: string } };

export type VerifyOtpInput = { channel: Channel; identifier: string; code: string };

export const authService = {
  sendOtp(input: SendOtpInput): Promise<{ sent: boolean }> {
    return request({ method: "POST", url: endpoints.auth.otpSend, data: input });
  },

  verifyOtp(input: VerifyOtpInput): Promise<{ user: Me; isNewUser: boolean }> {
    return request({ method: "POST", url: endpoints.auth.otpVerify, data: input });
  },

  logout(): Promise<{ signedOut: boolean }> {
    return request({ method: "POST", url: endpoints.auth.logout });
  },

  logoutAll(): Promise<{ signedOut: boolean }> {
    return request({ method: "POST", url: endpoints.auth.logoutAll });
  },
};
