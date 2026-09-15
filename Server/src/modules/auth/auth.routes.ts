import { Router } from "express";

import { handler } from "../../lib/http";
import { rateLimit } from "../../middleware/rate-limit";
import { optionalAuth, requireAuth } from "../../middleware/require-auth";
import { validate } from "../../middleware/validate";
import { authController } from "./auth.controller";
import { oauthCallbackQuerySchema, oauthStartQuerySchema, sendOtpSchema, verifyOtpSchema } from "./auth.schemas";

export const authRoutes = Router();

// Per-IP limits here; per-identifier limits (resend cooldown, sends/hour, attempts) live in otp.service.
authRoutes.post(
  "/otp/send",
  rateLimit({ name: "otp-send", limit: 10, windowSec: 15 * 60 }),
  validate("body", sendOtpSchema),
  handler(authController.sendOtp),
);

authRoutes.post(
  "/otp/verify",
  rateLimit({ name: "otp-verify", limit: 30, windowSec: 15 * 60 }),
  validate("body", verifyOtpSchema),
  handler(authController.verifyOtp),
);

authRoutes.get("/:provider", validate("query", oauthStartQuerySchema), handler(authController.oauthStart));
authRoutes.get("/:provider/callback", validate("query", oauthCallbackQuerySchema), handler(authController.oauthCallback));

authRoutes.post("/refresh", rateLimit({ name: "refresh", limit: 60, windowSec: 15 * 60 }), handler(authController.refresh));

// Logout works even with an expired access token: the refresh cookie path still matches.
authRoutes.post("/logout", optionalAuth, handler(authController.logout));
authRoutes.post("/logout-all", requireAuth, handler(authController.logoutAll));
