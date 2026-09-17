import type { Request, Response } from "express";

import { ok } from "../../lib/http";
import { validated } from "../../middleware/validate";
import type { SubmitOnboardingInput } from "./onboarding.schemas";
import { onboardingService } from "./onboarding.service";

export const onboardingController = {
  async submit(req: Request, res: Response): Promise<void> {
    ok(res, await onboardingService.submit(req.user!.id, validated<SubmitOnboardingInput>(req)));
  },
};
