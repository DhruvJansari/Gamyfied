import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import helmet from "helmet";

import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { originCheck } from "./middleware/origin-check";
import { authRoutes } from "./modules/auth/auth.routes";
import { onboardingRoutes } from "./modules/onboarding/onboarding.routes";
import { usersRoutes } from "./modules/users/users.routes";

export function createApp(): Express {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(originCheck);

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  // Every feature router mounts under /api so the Next.js rewrite proxy can forward the
  // whole prefix and the browser sees one origin (cookies need no Domain, no CORS dance).
  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/onboarding", onboardingRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
