import "dotenv/config";

import { defineConfig } from "prisma/config";

// Neon's pooled connection (PgBouncer, transaction mode) doesn't support the session-level
// advisory lock `prisma migrate` takes, so migrations run over the direct connection instead.
// The app itself keeps using the pooled DATABASE_URL (see src/config/db.ts) — only this CLI
// config differs. Locally there's no pooler, so DIRECT_URL is unset and DATABASE_URL covers both.
const migrationUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!migrationUrl) throw new Error("[prisma.config] DATABASE_URL (or DIRECT_URL) is required");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: migrationUrl,
  },
});
