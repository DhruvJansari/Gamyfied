import type { Request, Response } from "express";

import { ok } from "../../lib/http";
import { validated } from "../../middleware/validate";
import { verificationService } from "./verification.service";

const idParam = (req: Request) => validated<{ id: string }>(req, "params").id;

// Mounted under /projects/:id/verifications and /participations/:id/verifications (an action
// on the subject, so it lives on the subject's path — Project/Rules.md, Naming).
export const verificationController = {
  async requestForProject(req: Request, res: Response): Promise<void> {
    ok(res, await verificationService.requestForProject(req.user!.id, idParam(req)), 202);
  },

  async requestForParticipation(req: Request, res: Response): Promise<void> {
    ok(res, await verificationService.requestForParticipation(req.user!.id, idParam(req)), 202);
  },
};
