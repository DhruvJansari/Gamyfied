import { Router } from "express";

import { handler } from "../../lib/http";
import { rateLimit } from "../../middleware/rate-limit";
import { requireAuth } from "../../middleware/require-auth";
import { validate } from "../../middleware/validate";
import { socialLinksController } from "./social-links.controller";
import { addSocialLinkSchema, socialLinkIdParamsSchema } from "./social-links.schemas";

export const socialLinksRoutes = Router();

const perUser = (name: string) => rateLimit({ name, limit: 30, windowSec: 60 * 60, keyFrom: (req) => req.user?.id });

socialLinksRoutes.post("/", requireAuth, perUser("social-links-write"), validate("body", addSocialLinkSchema), handler(socialLinksController.add));
socialLinksRoutes.delete("/:id", requireAuth, perUser("social-links-write"), validate("params", socialLinkIdParamsSchema), handler(socialLinksController.remove));
