import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "../generated/prisma/client";
import { env } from "./env";

// One pool for the whole process. Prisma runs on top of it via the pg driver adapter,
// so repositories use `prisma` and never touch the pool directly.
const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  console.error("[postgres] idle client error", err);
});

export const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
  log: env.nodeEnv === "development" ? ["warn", "error"] : ["error"],
});

export async function connectPostgres(): Promise<void> {
  await prisma.$connect();
  const [info] = await prisma.$queryRaw<{ db: string; version: string }[]>`
    SELECT current_database() AS db, version() AS version
  `;
  console.log(`[postgres] connected to "${info?.db}" (${info?.version.split(",")[0]}) via Prisma`);
}

export async function closePostgres(): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
  console.log("[postgres] pool closed");
}
