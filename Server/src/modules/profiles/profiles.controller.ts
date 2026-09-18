import type { Request, Response } from "express";

import { ok } from "../../lib/http";
import { validated } from "../../middleware/validate";
import type { UpdateProfileInput } from "./profiles.schemas";
import { profilesService } from "./profiles.service";

export const profilesController = {
  async getMine(req: Request, res: Response): Promise<void> {
    ok(res, await profilesService.getOwnerView(req.user!.id));
  },

  async updateMine(req: Request, res: Response): Promise<void> {
    ok(res, await profilesService.updateProfile(req.user!.id, validated<UpdateProfileInput>(req)));
  },

  async getByHandle(req: Request, res: Response): Promise<void> {
    const { handle } = validated<{ handle: string }>(req, "params");
    ok(res, await profilesService.getPublicView(handle));
  },
};
