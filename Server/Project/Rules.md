Backend Rules

Rules for the Express and Node backend. These are not suggestions.

Read this before writing any new route, service, query or job.

If you are an AI assistant working in this folder, this file is your contract. Follow it without being asked. If a rule blocks you, say so rather than quietly working around it. If a rule genuinely must be broken, leave a comment at that spot explaining why and referencing this file. No comment means it was a mistake, not a decision.

The five rules that matter most
Never skip a layer. Route, then controller, then service, then repository.
Every request is validated before any logic runs.
Every response uses the same envelope, success and failure alike.
All errors exit through one place. Controllers throw, they do not format.
Postgres is the source of truth. Redis is always rebuildable from it.

Everything below is detail on these five.

Layering

The chain is route, then controller, then service, then repository. One direction only, never backwards, never skipping.

Routes map a path and method to a controller and attach middleware. Nothing else.
Controllers read the request, call one service, and shape the response. Nothing else. If a controller runs past roughly fifteen lines, logic has leaked into it. Move that logic down into a service.
Services hold all business logic. They never touch the request or response objects. A service should be callable from a background job without changing anything.
Repositories are the only place database queries exist. No business rules live here, and no query lives anywhere else.

A service calling another service is fine. A repository calling a service is not.

Validation
Every route validates its input before the controller runs. Body, params and query string all count.
Validation failures return a field-level error map so the frontend can show messages under the right inputs.
Never trust anything from the client, including values the frontend supposedly restricted. Re-check permissions, ownership and limits on the server every time.
Never trust an identifier sent by the client to determine who the user is. Take that from the session.
Responses

Every endpoint returns the same envelope shape, whether it succeeded or failed. A consumer should never have to guess which shape it got.

Successful responses carry the data and nothing extra.
Failed responses carry a machine-readable error code, a safe human-readable message, and an optional field error map.
Error codes are stable strings defined in one place and never changed casually. The frontend maps them to user-facing copy, so renaming one silently breaks the UI.
Lists are always paginated. Never return an unbounded collection, even when the table is small today.
Error handling
All errors exit through a single error-handling middleware. Controllers and services throw typed errors; only that middleware turns them into a response.
Never return a raw database error, driver error or stack trace to the client. Log the detail server-side, return a safe code and message.
Never swallow an error. An empty catch block is always a bug.
Distinguish expected failures from unexpected ones. An expected failure, such as a duplicate claim, gets a specific code and a four-hundred-level status. An unexpected failure gets logged loudly and returns the generic code.
Anything that touches an external service — GitHub, LeetCode, a user's website — must handle timeout, rate limit and malformed response as separate cases, and must fail soft rather than zeroing out a user's score.
Data
Postgres is the source of truth for everything. Full stop.
Redis holds the leaderboard, cached verification results, sessions, rate limit counters and job coordination.
Anything in Redis must be rebuildable from Postgres. Write the rebuild path at the same time as the cache, not later.
The leaderboard is a Redis sorted set. Position lookups and paging go through it, not through a sorted query in Postgres.
Score, rank and tier are three separate concepts and are stored and named separately. Score is a raw number. Rank is a position derived by sorting scores. Tier is a letter derived from rank. Never conflate them in a column, a variable or an API field.
Keep a history of rank changes. Users will constantly ask why their rank moved, and current state alone cannot answer that.
Every schema change ships as a migration. No manual changes to a live database.
Database transactions wrap anything that writes to more than one table.
Background work
Long-running work never happens inside a request handler. Verification, scoring runs and re-checks are all background jobs.
A request that triggers a job returns immediately with a job or status reference. The frontend polls or subscribes for the result.
Jobs must be safe to run twice. Assume they will be retried.
Jobs must be safe to fail. A failed verification leaves the previous score intact and marks the claim as needing a retry; it never wipes a user's standing.
Respect external rate limits. Use the user's own token for their own data wherever the provider allows it, and cache aggressively.
Security

These are project-level constraints, not preferences.

User-authored code is served from a separate origin from the main application, and rendered inside a sandboxed frame. It never runs where session cookies live.
Site-wide themes accept styling and declarative configuration only. Never accept or execute user JavaScript that will render on another user's screen.
Every mutating endpoint is rate limited per user and per address. This product's entire value is resistance to gaming.
Authorization is checked in the service layer, not only in middleware, so background jobs and internal calls are covered too.
Secrets come from environment configuration parsed once at boot. Never read directly from the environment deep inside application code, and never commit them.
Log identifiers, never credentials, tokens or full request bodies.
Naming
Route paths are plural nouns; actions on a resource are sub-paths, not verbs in the base path.
Service methods read as verb plus noun.
Repository methods say what they fetch and by what, so the query shape is obvious from the call site.
Error codes use screaming snake case and describe the situation, not the status code.
Database columns use snake case; application code uses camel case; the mapping happens in one place.

Pick a name once and use it everywhere. If the product calls it a claim, the database, the service and the API all call it a claim.

Before opening a pull request
No layer skipped; controllers stay thin
No database query outside a repository
Input validated before any logic runs
Response uses the standard envelope
New error codes registered in the shared list
No raw database or driver error reachable by the client
No empty catch blocks
Any new list endpoint is paginated
Any schema change ships with a migration
Anything long-running moved to a job
New mutating endpoints are rate limited
Keeping this file alive

This file drifts the moment the code disagrees with it and nobody updates either side.

If a rule no longer fits, change the rule in a pull request. Do not quietly work around it.
If you add a pattern others will need — a new error category, a new job convention — add it here in the same pull request.
Reviewers reject changes that break these rules without an explanation comment.
