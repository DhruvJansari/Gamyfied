import "dotenv/config";

import { randomInt } from "node:crypto";

import { closePostgres, connectPostgres, prisma } from "../config/db";
import { env } from "../config/env";
import { closeRedis, connectRedis } from "../config/redis";
import { generatePublicId } from "../lib/public-id";
import { BOARD_KEYS } from "../modules/leaderboard/boards.config";
import { leaderboardService } from "../modules/leaderboard/leaderboard.service";
import { scoringService } from "../modules/scoring/scoring.service";

// `npm run lb:seed [count]` — dev only. Creates ranked users with varied, real-engine-scored
// profiles so paging, tiers, the podium and the tie-break can actually be seen. Seed users are
// recognisable by their handle prefix and are replaced on every run.

const SEED_PREFIX = "seed-";
const DEFAULT_COUNT = 120;

const FIRST = ["Aarav", "Diya", "Kabir", "Meera", "Rohan", "Sana", "Vihaan", "Zara", "Ishaan", "Nia", "Arjun", "Tara", "Dev", "Riya", "Yash", "Anya"];
const LAST = ["Shah", "Patel", "Mehta", "Rao", "Iyer", "Nair", "Khan", "Desai", "Bose", "Joshi", "Kaur", "Verma"];
const HEADLINES = ["Backend engineer", "Frontend developer", "Full-stack builder", "ML tinkerer", "Mobile developer", "DevOps person", "Systems programmer", "Data engineer"];
const STACKS = [["TypeScript", "React", "Postgres"], ["Go", "Kubernetes", "Terraform"], ["Python", "PyTorch", "FastAPI"], ["Kotlin", "Android", "Compose"], ["Rust", "Wasm"], ["Java", "Spring"]];
const CATEGORIES = ["WEB_DEV", "MOBILE_DEV", "AI_ML", "DSA_CP", "DEVOPS_CLOUD", "GAME_DEV", "CYBERSECURITY", "DATA_SCIENCE"] as const;

const pick = <T>(items: readonly T[]): T => items[randomInt(items.length)]!;
const chance = (p: number) => Math.random() < p;
const lorem = (n: number) =>
  "Building things that hold up under real users, one deploy at a time. Interested in reliability, developer tools and teaching. ".repeat(4).slice(0, n);

async function removeSeedUsers(): Promise<number> {
  const { count } = await prisma.user.deleteMany({ where: { handle: { startsWith: SEED_PREFIX } } });
  return count;
}

async function createSeedUser(i: number): Promise<string> {
  const displayName = `${pick(FIRST)} ${pick(LAST)}`;
  const handle = `${SEED_PREFIX}${i.toString().padStart(3, "0")}`;
  const user = await prisma.user.create({
    data: {
      publicId: generatePublicId(),
      email: `${handle}@example.invalid`,
      emailVerifiedAt: new Date(),
      displayName,
      handle,
      profile: {
        create: {
          headline: pick(HEADLINES),
          bio: lorem(pick([60, 120, 180, 320])),
          ...(chance(0.6) ? { location: pick(["Ahmedabad", "Bengaluru", "Pune", "Berlin", "Remote"]) } : {}),
          ...(chance(0.4) ? { websiteUrl: `https://${handle}.example.invalid` } : {}),
          ...(chance(0.5) ? { yearsOfExperience: randomInt(0, 15) } : {}),
          ...(chance(0.5) ? { avatarUrl: `https://api.dicebear.com/9.x/thumbs/svg?seed=${handle}` } : {}),
        },
      },
      score: { create: {} },
      onboarding: { create: { stack: pick(STACKS), goal: "COMPETE", categories: [pick(CATEGORIES)] } },
      socialLinks: {
        create: [
          { platform: "GITHUB", url: `https://github.com/${handle}`, username: handle, trustLevel: chance(0.5) ? "LINKED" : "CLAIMED" },
          ...(chance(0.5) ? [{ platform: "LINKEDIN" as const, url: `https://www.linkedin.com/in/${handle}`, username: handle }] : []),
          ...(chance(0.3) ? [{ platform: "LEETCODE" as const, url: `https://leetcode.com/u/${handle}`, username: handle }] : []),
        ],
      },
      projects: {
        create: Array.from({ length: randomInt(1, 4) }, (_, p) => ({
          name: `Project ${p + 1}`,
          description: lorem(pick([50, 90, 140])),
          technologies: pick(STACKS),
          repoUrl: chance(0.6) ? `https://github.com/${handle}/project-${p + 1}` : null,
          liveUrl: chance(0.4) ? `https://project-${p + 1}.${handle}.example.invalid` : null,
          projectType: chance(0.85) ? "PUBLIC" : "PRIVATE",
        })),
      },
    },
  });
  // The real engine scores it and the real hook puts it on the board.
  await scoringService.recomputeProfileScore(user.id);
  return user.id;
}

async function main(): Promise<void> {
  if (env.isProduction) throw new Error("Refusing to seed a production database");
  const count = Number(process.argv[2] ?? DEFAULT_COUNT);

  await connectPostgres();
  await connectRedis();

  console.log(`[seed] removed ${await removeSeedUsers()} previous seed users`);
  const ids: string[] = [];
  for (let i = 1; i <= count; i++) ids.push(await createSeedUser(i));
  console.log(`[seed] created ${ids.length} ranked users`);

  // Spread the "reached this total first" clock over the past year so ties on equal totals
  // are broken by something other than creation order, then rebuild so the board reflects it.
  const now = Date.now();
  for (const id of ids) {
    await prisma.score.update({ where: { userId: id }, data: { totalChangedAt: new Date(now - randomInt(1, 365 * 24 * 3600) * 1000) } });
  }
  for (const board of BOARD_KEYS) await leaderboardService.rebuild(board);

  await Promise.all([closePostgres(), closeRedis()]);
}

main().catch((err) => {
  console.error("[seed] failed", err);
  process.exit(1);
});
