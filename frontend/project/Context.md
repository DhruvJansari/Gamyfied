# Project Context

> A gamified ranking platform for developers, where the profile is a codeable
> portfolio and every claim on it is verified before it counts toward your rank.

This document is the single source of truth for what we are building and why.
Read this before touching any code.

---

## 1. The one-line pitch

Developers write claims about themselves that nobody checks. We check them with an
AI agent, turn the verified result into a score, rank everyone by that score, and
make the whole thing a game worth playing.

## 2. The problem

Three problems, stacked:

1. **Portfolios get no traffic.** A developer spends two weeks building a beautiful
   personal site. Nobody visits it. There is no distribution channel for individual
   developer work.
2. **Profiles are unverified claims.** Anyone can write "built a SaaS with 10k users"
   on LinkedIn. Recruiters cannot tell the difference between real and invented, so
   they fall back on brand names and referrals.
3. **Nothing makes you come back.** GitHub profiles, LinkedIn, personal sites — all
   static. There is no reason to open them daily.

## 3. The solution

| Problem             | Our answer                                                                 |
| ------------------- | -------------------------------------------------------------------------- |
| No traffic          | Ranking _is_ distribution. Higher rank = higher placement = more visitors. |
| Unverified claims   | An agentic layer checks each claim and only scores what it can prove.      |
| No reason to return | Tiers you can lose, clan battles, seasonal events, mini games.             |

The game mechanics are borrowed deliberately:

- **Leaderboard and tiers** — PUBG-style competitive ladder
- **Clans and clan battles** — Clash of Clans
- **User-created content and mini games** — Roblox
- **Rank letters (S / A / B / C / D / E)** — One Punch Man hero ranking
- **Permanent friend ID** — standard across all of the above

---

## 4. Core concepts

Three numbers that are easy to confuse. Keep them separate everywhere in the codebase.

- **Score** — a raw number. Sum of verified claim scores plus activity and event
  points. Grows continuously. Never reset mid-season.
- **Rank** — an integer position on the leaderboard. Derived purely by sorting all
  users by score. Rank 1 is the highest score on the platform.
- **Tier** — the letter class your _rank_ falls into. You do not earn a tier, you
  occupy one. Someone overtaking you pushes you down.

That third layer is the whole emotional engine. S-tier is not a badge you keep, it
is twenty chairs, and someone is always trying to take yours.

---

## 5. Features

### 5.1 Auth and accounts

- Sign in with **Google**, **GitHub**, or a **one-time code by email or phone**. There
  are no passwords anywhere in the system (see `Server/Project/Auth.md`)
- Guests can browse the leaderboard, public profiles and the global community
  without an account. They cannot post, compete or be ranked.
- GitHub sign-in is the preferred path, since we need that connection anyway for
  verification

### 5.2 Permanent user ID

- Every account gets a short permanent ID at signup, e.g. `#7K2M9QX`
- 7 alphanumeric characters from an unambiguous set (no `0`/`O`, no `1`/`I`/`l`)
- **The ID never changes.** Display name and profile URL handle can change freely
- Everything resolves against the ID: friend requests, clan invites, mentions,
  event entries, recruiter bookmarks
- Privacy toggle: accept friend requests by ID, or invite-only

> Design note: keeping the permanent ID separate from the changeable username is not
> optional. The moment someone renames themselves, every stored reference to their old
> handle breaks unless we were resolving IDs from day one.

### 5.3 Onboarding

Short questionnaire immediately after first sign-in:

- Primary skills and stack
- What they want from the platform (get hired / build audience / compete)
- Which skill categories they want to be ranked in

Output seeds their category placement and their starting profile template.

### 5.4 Profile, placement and profile score

The profile is the product's centre, not a settings page. It lives at `/profile` (the
owner's view: edit everything, see placement progress and why the score is what it is)
and `/u/[handle]` (the public view, guests welcome, server-rendered).

The one idea behind all of it:

> A profile is not valuable because it is complete. It becomes valuable as its contents
> get harder to fake and better supported by evidence.

**Placement — the gate.** A new user is unranked and off the leaderboard until they finish
three short tasks (the whole thing should take under thirty minutes):

| # | Task                                | Required | Done when                                    |
| - | ----------------------------------- | -------- | -------------------------------------------- |
| 1 | Basic profile                       | yes      | headline + a 40-character bio                |
| 2 | Social / professional identity      | yes      | one supported platform link (max 4)          |
| 3 | Projects / work evidence            | yes      | one project with a description (max 5)       |
| 4 | Community / collaboration           | **no**   | optional, skippable, never penalised (max 5) |

3/3 required → ranked, permanently. Placement awards no points; it only decides eligibility.
Everything else — external activity, project verification, employment — is a scoring
dimension inside its task, never a further gate.

**Profile score — the reputation.** Every item declares a maximum and earns a fraction of
it based on evidence: `points = max × evidenceFactor`.

- A typed social link is a *claim* (20%). Signing in with that platform makes it *linked*
  (60%). Agent verification makes it *verified* (100%).
- A project with only a description earns 10% of its maximum; with a repository or live
  link 25%; with both 35%; verified, up to 100%. Private / organisation projects are capped
  at 25% because the agent cannot inspect them.
- Adding, removing and re-adding earns nothing: the score is recomputed from current
  state on every write and stored with an explanation the user can expand line by line.

`total = 1000 (base) + profile score` today; activity and event scores are separate
domains added later. Numbers are in `Server/src/modules/scoring/scoring.config.ts`.

**Custom portfolio page (later, optional).** The earlier idea of a raw HTML/CSS/JS
portfolio editor is deferred and becomes an optional section linked from the profile, not
the profile itself. When it arrives, the hard constraint stands: user code renders on a
separate origin inside a sandboxed iframe, never where session cookies live.

### 5.5 Agentic verification layer

The differentiator. We store nothing on trust.

A user adds claims to their profile. For each one, the agent checks:

| Claim            | What we check                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| Personal website | Performance, uptime, whether it is original work or a template, domain age, quality of the idea |
| GitHub           | Contribution consistency over time, plus a deep scan of **only the repos the user submits**     |
| LeetCode         | Consistency and problem-solving depth                                                           |
| LinkedIn         | Account is real and belongs to them                                                             |

Rules:

- Claims that cannot be verified stay visible on the profile and earn only a **small
  fraction** of their possible score (see §5.4); linking and verification unlock the rest
- Verification is a background job, not a request. It takes seconds to minutes. Today the
  "Verify" button queues a request behind a provider interface
  (`Server/src/modules/verification/provider.ts`); the agent implements that interface later
- Results are cached. Re-verification happens on a schedule, because a profile
  verified in January is a lie by June.
- Weighting favours things that are expensive to fake (months of commit history,
  code quality in submitted repos) over things that are cheap to buy (follower counts)

### 5.6 Ranking, tiers and leaderboard

Global leaderboard plus per-skill leaderboards.

**Tier bands (launch values):**

| Tier | Ranks          | Subdivisions                              |
| ---- | -------------- | ----------------------------------------- |
| S    | 1 – 20         | S++ (1–3), S+ (4–6), S (7–10), S− (11–20) |
| A    | 21 – 200       | A+ (21–60), A (61–120), A− (121–200)      |
| B    | 201 – 1,000    | B+ (201–400), B (401–700), B− (701–1,000) |
| C    | 1,001 – 5,000  | —                                         |
| D    | 5,001 – 20,000 | —                                         |
| E    | below 20,000   | —                                         |

**Scaling rule:** S stays absolute forever — twenty chairs, permanently, because
scarcity is the entire point. A through E become percentile bands as the user base
grows, so that C-tier does not become meaningless at 5 million users. Users always
see clean numbers; only the boundaries move.

### 5.7 Clans

- Users create or join clans
- **Clan battles** run weekly and monthly for points
- Judged on idea evaluation, problem solving, and popularity
- **Internal clan community** — a private chat and feed, members only
- Clan performance feeds both clan ranking and individual member scores

### 5.8 Mini games and tasks

Between battles, to keep people returning:

- Mini games, mini tasks, UI challenges
- Users can **code the challenges too**, not just play them
- Small point rewards, so the ladder is never fully idle

### 5.9 Festival theme contest

The strongest engagement mechanic, because the prize is traffic rather than a badge.

**Festivals covered:** Diwali, Holi, Christmas, Halloween, Eid, Lunar New Year,
New Year's Eve, and other major Indian and global dates.

**How it runs:**

1. Contest opens two to three weeks before the date
2. Users submit a coded UI theme — leaderboard background, accent colours, banner
3. Solo entries and clan entries both allowed; clan entries earn clan battle points
4. Top 5 chosen by agent scoring for craft plus community votes for appeal
5. Themes go live on a countdown:

| When                         | Whose theme is live                          |
| ---------------------------- | -------------------------------------------- |
| Day −5                       | 5th place                                    |
| Day −4                       | 4th place                                    |
| Day −3                       | 3rd place                                    |
| Day −2                       | 2nd place                                    |
| Day −1 through the event day | **Winner** (holds both highest-traffic days) |

Every live theme carries a credit line linking to its creator's profile. For an
unknown developer, 24 hours of "theme by @handle" on the busiest page of the site
during the busiest day of the year is worth more than any badge.

**Hard constraint:** a site-wide theme renders on _every other user's_ screen. It
accepts CSS and a declarative config only — **no arbitrary JS**. Raw JS stays confined
to the user's own sandboxed profile page, where the blast radius is one person. Every
winning theme gets a human review before going live, plus an enforced contrast floor
so the leaderboard stays readable.

### 5.10 Communities

Two separate layers:

- **Global community** — Reddit-style forum, open to all users, guests can read
- **Clan community** — private per-clan chat and feed

### 5.11 Recruiter side

The payoff that makes the game worth playing.

- Because signals are verified, recruiters can predict actual skill instead of
  reading claims
- Browse and filter by tier, skill category, and verified evidence
- Every profile links to a real, working portfolio the user built themselves

---

## 6. Tech stack

### Frontend

- **Next.js** — app shell, routing, SSR for public profile and leaderboard pages
- **Zustand** — client UI state only (editor state, modals, filters)
- **TanStack Query** — all server state, caching, refetching
- **axios** — HTTP client
- **Skeleton loaders** — every list, profile and leaderboard page gets a proper
  skeleton, not a spinner

Rule: Zustand never holds server data. If it came from the API, it lives in
TanStack Query.

### Backend

- **Node.js + Express** — REST API
- **Redis** — leaderboard, caching, sessions, background job coordination

### Data

- **PostgreSQL** — the source of truth. Users, profiles, claims, verification
  results, score history, clans, events, posts.
- **Redis** — the fast read and coordination layer:
  - **Sorted sets** for the leaderboard. `ZADD` the score, `ZREVRANK` for a user's
    exact position, `ZREVRANGE` to page the board. Tier is then a lookup on rank.
    This is the single best fit between our product and our stack — sorting millions
    of rows in Postgres on every leaderboard page view will not hold up.
  - Cached verification results
  - Sessions
  - Rate limiting counters
  - Job queue for verification runs

Redis is never the source of truth. It must always be rebuildable from Postgres.

### Auth

- Google OAuth
- GitHub OAuth
- Passwordless one-time code (email or SMS)

---

## 7. Rough data model

Not final, but the shape we are working toward:

```
users              id, public_id (#7K2M9QX), email, display_name, handle, created_at
accounts           user_id, provider (google|github), provider_account_id, provider_username, avatar_url, profile_url
onboarding         user_id, stack[], goal, categories[]
profiles           user_id, avatar_url, headline, bio, location, website_url, years_of_experience
social_links       id, user_id, platform, url, username, trust_level (claimed|linked|verified), account_id
projects           id, user_id, name, description, technologies[], repo_url, live_url, project_type, verification_status
participations     id, user_id, kind, title, note, url, year, verification_status
verifications      id, user_id, subject_type, subject_id, status, source, signals (jsonb), result (jsonb), points, expires_at
profile_scores     user_id, points, breakdown (jsonb), rules_version, computed_at
scores             user_id, base, total, is_ranked, ranked_at            (+ activity_scores, event_scores later)
rank_snapshots     user_id, rank, tier, captured_at
portfolio_pages    user_id, html, css, js, published_at                  (deferred, see §5.4)
leaderboard_rows   user_id, css, published_at                           (deferred)
clans              id, name, tag, owner_id, created_at
clan_members       clan_id, user_id, role, joined_at
events             id, type (battle|minigame|theme_contest), festival, starts_at, ends_at
event_entries      id, event_id, user_id, clan_id, payload, placement, points
themes             id, event_entry_id, css, config, approved_by, live_from, live_until
posts / comments   standard forum tables, global and clan-scoped
friendships        user_id, friend_user_id, status
```

`rank_snapshots` exists so we can answer "why did my rank drop" — which users will
ask constantly, and which is impossible to answer from current state alone.

---

## 8. Build order

**Phase 1 — the core loop**
Auth → permanent user ID → onboarding → profile + placement + profile score (done) →
verification for GitHub only → single global leaderboard with tiers.

Nothing else. If this slice is not compelling, no amount of clan battles will save it.

**Phase 2 — credibility**
Add website, LeetCode and LinkedIn verification. Re-verification schedule. Score
history and the "why did my rank change" view.

**Phase 3 — retention**
Clans, clan chat, clan battles. Custom leaderboard row styling.

**Phase 4 — culture**
Festival theme contests. Mini games and user-created challenges. Global community.

**Phase 5 — monetisation path**
Recruiter search and filtering.

---

## 9. Open questions

Things we have not decided, and that will need answers before the relevant phase:

1. **LinkedIn growth scoring.** There is no public API exposing connection counts or
   growth, and scraping breaks their terms of service. Current plan is to verify
   identity only and drop growth from the score. Needs a final call.
2. **Website traffic.** We cannot measure a third party's traffic from outside — no
   public source has real numbers for a personal site. Options: score performance and
   originality instead, or ask the user to connect an analytics account read-only so
   the numbers are consented and accurate. Needs a decision.
3. **LeetCode data source** is unofficial and will break occasionally. Needs to fail
   soft rather than zero out someone's score.
4. **Anti-gaming.** The whole product's value is resistance to faking. We need an
   explicit list of what is cheap to fake and a weighting that reflects it.
5. **Score decay.** Does an inactive S-tier user slide down over time, or hold their
   position forever? This decides whether the top of the ladder ever moves.
6. **Season resets.** Do we run seasons at all, or is the ladder continuous?
7. **Tier boundary migration.** When do we switch A–E from absolute to percentile,
   and how do we communicate it without users feeling demoted?

---

## 10. Non-negotiables

Four rules that do not bend, whatever the deadline pressure:

1. **User code never runs on the main origin.** Separate domain, sandboxed iframe.
2. **Site-wide themes are CSS and config only.** No user JS on other people's screens.
3. **The permanent user ID is never reused and never changes.**
4. **Unverified claims earn only a small fraction of their possible score.** Only a linked
   identity or independent verification unlocks full value. The moment an unchecked claim
   is worth as much as a checked one, the product has no reason to exist.
