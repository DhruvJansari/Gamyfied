# Gamyfied API

Express + TypeScript. Rules of the road: [Project/Rules.md](Project/Rules.md).

## Run

```sh
cp .env.example .env   # fill DATABASE_URL, REDIS_URL, SESSION_SECRET
npm install            # also runs `prisma generate`
npm run dev
```

## Auth

Passwordless: OTP by email/phone, plus GitHub and Google OAuth. Design and every
lifetime/limit: [Project/Auth.md](Project/Auth.md). In development `OTP_SENDER=console`
prints codes to this terminal. `.env` needs `TOKEN_ENCRYPTION_KEY` (32 bytes hex) — see
`.env.example` for the generator one-liner and the OAuth callback URLs.

## Database (Prisma)

- Schema: `prisma/schema.prisma` — the only place table structure is defined.
- Config: `prisma.config.ts` — reads `DATABASE_URL` from `.env`.
- Client: `import { prisma } from "@/config/db"` inside repositories only.

| Task | Command |
| --- | --- |
| Edit schema → create + apply migration | `npm run db:migrate -- --name <what_changed>` |
| Regenerate client after pulling | `npm run db:generate` |
| Apply migrations in prod/CI | `npm run db:deploy` |
| Check pending migrations | `npm run db:status` |
| Browse data | `npm run db:studio` |

Never edit a live database by hand — every change is a migration committed under
`prisma/migrations/`.
