# Authentication

> Passwordless. A user proves they own an email or phone with a one-time code (or signs in
> with GitHub / Google), and gets a short-lived access token plus a long-lived, rotating
> refresh token — both in httpOnly cookies. Nothing here stores a password.

Read this before touching `src/modules/auth`, `src/middleware/require-auth.ts`, or the
frontend API client.

---

## 1. The whole thing in one paragraph

Sign in sends a 6-digit code to the email or phone. Verifying it (or completing OAuth)
creates a **session** row and sets two cookies: `gf_access` (JWT, 30 min) that proves who
you are on every request, and `gf_refresh` (random string, 7 days, sliding) that can only
be used at `/api/auth/*` to mint a new pair. Every refresh **rotates** the refresh token.
Presenting an already-rotated token means it was stolen, so the session is revoked. Access
tokens are checked by signature (no DB); a Redis denylist of revoked session ids makes
logout and "sign out everywhere" instant.

## 2. Numbers

| Thing                          | Value                               | Where                              |
| ------------------------------ | ----------------------------------- | ---------------------------------- |
| Access token lifetime          | 30 min                              | `tokens.ts` `ACCESS_TTL_SEC`       |
| Refresh token lifetime         | 7 days sliding, 30 days absolute    | `tokens.ts`                        |
| Refresh reuse grace (tab race) | 10 s                                | `sessions.service.ts`              |
| OTP lifetime                   | 5 min                               | `otp.service.ts`                   |
| OTP wrong attempts             | 5, then the code is void            | `otp.service.ts`                   |
| OTP resend cooldown            | 60 s                                | `otp.service.ts`                   |
| OTP sends per identifier       | 5 / hour                            | `otp.service.ts`                   |
| OTP sends per IP               | 10 / 15 min                         | `auth.routes.ts`                   |
| OTP verifies per IP            | 30 / 15 min                         | `auth.routes.ts`                   |
| `/users/me` cache              | 5 min in Redis, 5 min in the client | `users.service.ts`, `use-auth.ts`  |

## 3. Cookies

| Cookie       | Holds                  | HttpOnly | SameSite | Path        | Why                                                          |
| ------------ | ---------------------- | -------- | -------- | ----------- | ------------------------------------------------------------ |
| `gf_access`  | JWT `{sub, sid, role}` | yes      | Lax      | `/`         | Sent with every request; JS cannot read it                   |
| `gf_refresh` | opaque token           | yes      | Strict   | `/api/auth` | Only ever travels to the auth routes                         |
| `gf_session` | `"1"`                  | **no**   | Lax      | `/`         | No secret. Tells the client and `proxy.ts` a session exists  |

`Domain` is never set. The future user-content origin must not receive these
(Context.md non-negotiable #1). `Secure` is on in production.

The browser talks to one origin: Next.js rewrites `/api/*` to Express (`next.config.ts`),
so there is no CORS preflight and cookies need no cross-site rules.

## 4. Flows

**Sign in / sign up with a code**

1. `POST /api/auth/otp/send` `{channel, identifier, intent, profile?}` → code stored as a
   SHA-256 hash in Redis (`otp:{channel}:{sha256(identifier)}`), sent via `senders.ts`.
   Sign-up carries `profile` (display name, other contact) in the same Redis hash.
   Unknown identifiers still get "sent" so the response never reveals who has an account.
2. `POST /api/auth/otp/verify` `{channel, identifier, code}` → hash compared in constant
   time, key deleted (single use). Then:
   - account exists → sign in; the channel is marked verified if it wasn't
   - no account, profile present → create the user (permanent ID, handle) and sign in
   - no account, no profile → `404 ACCOUNT_NOT_FOUND`; the frontend goes to sign-up with
     the identifier pre-filled (they already proved they own it)

**OAuth (GitHub, Google)**

1. `GET /api/auth/:provider` → random `state` saved in Redis (10 min), redirect to provider.
2. `GET /api/auth/:provider/callback` → `state` consumed, code exchanged, verified email
   fetched. Lookup order: provider account → user with the same *verified* email (link) →
   create. GitHub's token is stored AES-256-GCM encrypted for later repo verification.
3. Cookies set, redirect to `FRONTEND_URL` (`/onboarding` for new users). Failures redirect
   to `/sign-in?error=<code>`.

**Authenticated request** — `requireAuth`: verify JWT (no I/O) → one Redis `EXISTS` on
`revoked:{sid}` → `req.user = {id, sid, role}`. Zero Postgres queries.

**Refresh** — `POST /api/auth/refresh`: find session by hash of the presented token.
- found, live → rotate (old hash to `previousTokenHash`, new hash current, expiry slides),
  new cookies. Two reads + one write, once per 30 min per active user.
- not found, but matches some session's `previousTokenHash` → **reuse**. If rotated less
  than 10 s ago it is two tabs racing: `409 REFRESH_RACE`, cookies untouched. Otherwise
  the session is revoked and denylisted; `401 REFRESH_INVALID`, cookies cleared.
- revoked / expired / unknown → `401 REFRESH_INVALID`, cookies cleared.

The frontend client (`lib/api/client.ts`) refreshes on `ACCESS_TOKEN_EXPIRED` or
`UNAUTHENTICATED` when `gf_session` is present, once per request, single-flight per tab
and behind a Web Lock across tabs.

**Logout** — `POST /api/auth/logout` revokes the session (by sid, or by refresh token if
the access token already expired), denylists it, clears cookies. `logout-all` does the
same for every session of the user.

## 5. Postgres vs Redis

Postgres (source of truth): `users`, `accounts`, `sessions`.

Redis (short-lived; losing it is harmless):

| Key                                   | TTL     | Purpose                                    |
| ------------------------------------- | ------- | ------------------------------------------ |
| `revoked:{sid}`                       | 30 min  | Access-token denylist; rebuildable from `sessions.revoked_at` |
| `otp:{channel}:{hash}`                | 5 min   | Code hash, attempts, sentAt, pending profile |
| `otp-sends:{channel}:{hash}`          | 1 h     | Sends per identifier                       |
| `oauth:state:{state}`                 | 10 min  | OAuth CSRF state                           |
| `rl:{name}:{ip}`                      | window  | Per-IP rate limits                         |
| `user:me:{userId}`                    | 5 min   | `/users/me` DTO cache                      |

## 6. Roles and authorization

`Role` = `USER | MODERATOR | ADMIN`, on the user row and inside the JWT. `requireRole()` is
the coarse gate; services re-check role and ownership so jobs and internal calls are
covered too. Role is at most 30 min stale in a token — a demotion or ban must also call
`revokeAllSessions(userId, "role_change")`. Identity always comes from `req.user`, never
from the request body.

## 7. Threats and the answer to each

| Threat                    | Answer                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------- |
| XSS steals tokens         | httpOnly cookies; `helmet` defaults; user code never runs on this origin                |
| CSRF                      | SameSite cookies **and** `originCheck` on every mutating request                        |
| Stolen refresh token      | Rotation + reuse detection                                                              |
| OTP brute force           | 5 attempts per code, per-IP and per-identifier send limits, codes hashed in Redis       |
| Enumeration               | Send always answers "sent"; only verify (after proof of ownership) reveals state        |
| Account takeover via OAuth| Linking by email only when the provider marks the email verified                        |
| Open redirect             | `returnTo` must be a relative path (schema + `safeReturnTo`)                            |
| Provider token at rest    | AES-256-GCM with `TOKEN_ENCRYPTION_KEY`                                                 |

## 8. Sending codes

`OTP_SENDER=console` (default) prints the code to the server log. `OTP_SENDER=live` uses:
- email: any SMTP server via Nodemailer (`SMTP_URL`)
- SMS: an HTTP POST to `SMS_GATEWAY_URL` — shaped for the open-source
  [android-sms-gateway](https://github.com/capcom6/android-sms-gateway) (a spare Android
  phone with a SIM). Real SMS is never free at scale; swap the URL for a paid vendor when
  it matters.

## 9. Deliberately not built (yet)

Re-authentication for sensitive operations (a fresh OTP will do when needed), email
change, "your devices" page, JWT secret rotation, breached-credential checks. Each is small
and slots in without changing the above.
