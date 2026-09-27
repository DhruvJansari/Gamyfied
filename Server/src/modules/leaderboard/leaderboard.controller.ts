import type { Request, Response } from "express";

import { ok } from "../../lib/http";
import { validated } from "../../middleware/validate";
import type { BoardQuery, PageQuery, SearchQuery } from "./leaderboard.schemas";
import { leaderboardService } from "./leaderboard.service";

export const leaderboardController = {
  async getPage(req: Request, res: Response): Promise<void> {
    const { board, page, tier } = validated<PageQuery>(req, "query");
    ok(res, await leaderboardService.getPage(board, page, tier ?? null));
  },

  async search(req: Request, res: Response): Promise<void> {
    const { board, q } = validated<SearchQuery>(req, "query");
    ok(res, await leaderboardService.search(board, q));
  },

  async getMine(req: Request, res: Response): Promise<void> {
    const { board } = validated<BoardQuery>(req, "query");
    ok(res, await leaderboardService.getMyRank(board, req.user!.id));
  },
};
