import { env } from "../../config/env";
import type { VerificationOutcome, VerificationProvider, VerificationRequest } from "./provider";

/**
 * This phase's placeholder: it does not look at anything. Requests stay pending and the UI
 * says "queued — agent verification coming soon". Outside production, VERIFICATION_MOCK_OUTCOME
 * can force a result so the verified states can be built and seen in the UI.
 */
export const mockVerificationProvider: VerificationProvider = {
  source: "MOCK",

  async request(_req: VerificationRequest): Promise<VerificationOutcome | null> {
    const forced = env.verificationMockOutcome;
    if (!forced || env.isProduction) return null;
    return {
      status: forced,
      // Generous on purpose: the scoring engine caps it at the item's ceiling anyway.
      points: forced === "VERIFIED" ? 1000 : forced === "PARTIALLY_VERIFIED" ? 50 : 0,
      result: { mock: true, forcedBy: "VERIFICATION_MOCK_OUTCOME" },
      errorCode: null,
    };
  },
};
