import type { Request, Response } from "express";

import { ok } from "../../lib/http";
import { validated } from "../../middleware/validate";
import type { AddSocialLinkInput } from "./social-links.schemas";
import { socialLinksService } from "./social-links.service";

export const socialLinksController = {
  async add(req: Request, res: Response): Promise<void> {
    ok(res, await socialLinksService.addClaimed(req.user!.id, validated<AddSocialLinkInput>(req)), 201);
  },

  async remove(req: Request, res: Response): Promise<void> {
    const { id } = validated<{ id: string }>(req, "params");
    await socialLinksService.remove(req.user!.id, id);
    ok(res, { removed: true });
  },
};
