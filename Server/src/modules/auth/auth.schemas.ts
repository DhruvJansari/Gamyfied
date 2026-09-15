import { z } from "zod";

// Identifier normalization lives here so every route sees the same canonical value.

const DEFAULT_COUNTRY_CODE = "+91";
const E164 = /^\+[1-9]\d{7,14}$/;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(254);

export const phoneSchema = z
  .string()
  .trim()
  .transform((raw) => {
    const digits = raw.replace(/[\s\-().]/g, "");
    // A bare 10-digit number is assumed to be local (India by default).
    return /^\d{10}$/.test(digits) ? `${DEFAULT_COUNTRY_CODE}${digits}` : digits;
  })
  .refine((v) => E164.test(v), "Enter a valid phone number with country code");

export const displayNameSchema = z.string().trim().min(2, "At least 2 characters").max(60, "At most 60 characters");

export const channelSchema = z.enum(["email", "phone"]);

/** POST /auth/otp/send */
export const sendOtpSchema = z.discriminatedUnion("channel", [
  z.object({
    channel: z.literal("email"),
    identifier: emailSchema,
    intent: z.enum(["signin", "signup"]).default("signin"),
    profile: z.object({ displayName: displayNameSchema, phone: phoneSchema.optional() }).optional(),
  }),
  z.object({
    channel: z.literal("phone"),
    identifier: phoneSchema,
    intent: z.enum(["signin", "signup"]).default("signin"),
    // Email is required on the account, so a phone sign-up must carry one.
    profile: z.object({ displayName: displayNameSchema, email: emailSchema }).optional(),
  }),
]);
export type SendOtpInput = z.infer<typeof sendOtpSchema>;

/** POST /auth/otp/verify */
export const verifyOtpSchema = z.discriminatedUnion("channel", [
  z.object({ channel: z.literal("email"), identifier: emailSchema, code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code") }),
  z.object({ channel: z.literal("phone"), identifier: phoneSchema, code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code") }),
]);
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

/** GET /auth/:provider */
export const oauthStartQuerySchema = z.object({
  // Only same-site relative paths, so the callback can never bounce a user off-site.
  returnTo: z
    .string()
    .regex(/^\/(?!\/)/, "returnTo must be a relative path")
    .max(512)
    .optional(),
});

/** GET /auth/:provider/callback */
export const oauthCallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});
