import type { Request, Response } from "express";

import { ok } from "../../lib/http";
import { validated } from "../../middleware/validate";
import type { CreateParticipationInput, UpdateParticipationInput } from "./participations.schemas";
import { participationsService } from "./participations.service";

const idParam = (req: Request) => validated<{ id: string }>(req, "params").id;

export const participationsController = {
  async create(req: Request, res: Response): Promise<void> {
    ok(res, await participationsService.create(req.user!.id, validated<CreateParticipationInput>(req)), 201);
  },

  async update(req: Request, res: Response): Promise<void> {
    ok(res, await participationsService.update(req.user!.id, idParam(req), validated<UpdateParticipationInput>(req)));
  },

  async remove(req: Request, res: Response): Promise<void> {
    await participationsService.remove(req.user!.id, idParam(req));
    ok(res, { removed: true });
  },
};
