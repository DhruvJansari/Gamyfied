import type { Request, Response } from "express";

import { ok } from "../../lib/http";
import { validated } from "../../middleware/validate";
import type { CreateProjectInput, UpdateProjectInput } from "./projects.schemas";
import { projectsService } from "./projects.service";

const idParam = (req: Request) => validated<{ id: string }>(req, "params").id;

export const projectsController = {
  async create(req: Request, res: Response): Promise<void> {
    ok(res, await projectsService.create(req.user!.id, validated<CreateProjectInput>(req)), 201);
  },

  async update(req: Request, res: Response): Promise<void> {
    ok(res, await projectsService.update(req.user!.id, idParam(req), validated<UpdateProjectInput>(req)));
  },

  async remove(req: Request, res: Response): Promise<void> {
    await projectsService.remove(req.user!.id, idParam(req));
    ok(res, { removed: true });
  },
};
