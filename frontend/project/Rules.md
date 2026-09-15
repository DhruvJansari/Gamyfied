# Frontend Rules

> Rules for the Next.js frontend. These are not suggestions.

Read this before writing any new page, component, hook or file.

If you are an AI assistant working in this folder, this file is your contract. Follow
it without being asked. If a rule blocks you, say so rather than quietly working
around it. If a rule genuinely must be broken, leave a comment at that spot explaining
why and referencing this file. No comment means it was a mistake, not a decision.

---

## The five rules that matter most

1. Reuse a component when the logic and the data are the same. Do not split UI into
   pieces before there is a reason to.
2. No component ever calls axios directly.
3. No URL string exists anywhere except the endpoints file.
4. Every API call handles its error. Silent failure is a bug.
5. Every async view handles four states: loading, error, empty, success. Missing any
   one of them is an incomplete feature.

Everything below is detail on these five.

---

## Component reuse

Default to writing the markup where it is used. Pull something out into its own
component only when there is a real reason to. Over-splitting into tiny components is
its own kind of mess and makes the codebase harder to work in, not easier.

**Extract a component when:**

- The same UI is backed by the same logic and the same data, and is needed in more
  than one place. That is the real signal — same purpose, same shape, same behaviour.
- A block has grown large enough that the file around it has become hard to read.
- The piece carries non-obvious behaviour that should only exist once: the code
  editor, the leaderboard row, the claim verification chip, the skeleton for a card.

**Do not extract when:**

- Two things merely look alike. If they serve different purposes or carry different
  data, leave them separate. Forcing them into one component produces something with
  a pile of props and a branch for every caller, which is worse than the duplication
  it replaced.
- It is a small element — a button, an input, a label — used once on one screen. Write
  it inline. Not every element needs a wrapper.
- You are guessing about future reuse. Wait for the second real use to actually appear.

**Where it lives:**

- Used by one feature, stays inside that feature.
- Used by two or more features with the same logic and data, moves to shared.
- Move it when the second use appears, not in anticipation of it.

**Once a component is shared:**

- Handle differences with props rather than forking a near-identical copy.
- Change it in place. If a caller needs something the component cannot do, either add
  the prop or accept that this caller is a different thing and write it separately.

**Consistency:**

Duplicating markup is fine. Duplicating design decisions is not. Colours, spacing,
radii, typography and shadows come from shared tokens, so that ten hand-written buttons
across the app still look like one product. If you find yourself editing the same
visual value in several files, that value belongs in a token — which is usually the
right fix, not a new component.

**Tokens live in `DESIGN.md`** and are exposed as Tailwind utilities in `globals.css`.
Colours are semantic roles (`bg-canvas`, `text-ink`, `text-body`, `border-hairline`,
`bg-primary text-on-primary`) with a light and a dark value each. Never write a hex or
a palette colour (`zinc-50`, `black`) in a component. If a component needs a `dark:`
prefix for a colour, the token is missing — add it to `globals.css`, don't work around
it. Theme is a user setting applied via `.dark` on `<html>` (`src/lib/theme.ts`).

**Typography:**

- One font: Google Sans, Regular 400 by default. It is loaded once in
  `app/layout.tsx` via `next/font` and exposed as the single Tailwind utility
  `font-google-sans`. Do not add other font utilities or a separate CSS type system.
- Text size comes from the semantic tag, styled once in `globals.css` `@layer base`:
  `h1` page title, `h2` section, `h3` subsection, `h4` minor heading, `p` body,
  `small` supporting. Pick the tag for the content's structure, not for its size.
- Every page has exactly one `h1`. Do not skip heading levels. Do not put a size
  utility on a heading just to make it look like a different level — that is the
  wrong tag.

---

## Centralized API access

A component never imports axios. A component never writes a URL. Both are absolute.

The chain is always: component, then hook, then service, then the shared client, then
the endpoints file. One direction only, no skipping layers.

**The endpoints file.** Every endpoint in the app is defined here, grouped by domain.
When the backend changes a path, this is the only file that changes. No exceptions,
including for one-off calls and quick experiments.

**The client.** Exactly one axios instance for the whole app. It owns the base URL,
the timeout, credentials, the auth header, and error normalization. Nothing else
creates an axios instance.

**The services.** One file per domain. Each function maps to one endpoint and does
nothing else — no business logic, no state, no formatting.

**The query keys.** All query keys live in one factory file. Never write a key array
inline. Inline keys make cache invalidation unreliable and the bugs are hard to find.

**The hooks.** Components import hooks and nothing else from the API layer. Every
query and every mutation has a hook.

---

## State ownership

- Anything that came from the API lives in TanStack Query. Always.
- UI state such as modals, tabs, open panels and editor layout lives in Zustand.
- Form input lives in local component state.
- Anything a user should be able to share by copying the URL — page number, active
  filter, selected tab — lives in search params, not Zustand.

Never copy server data into Zustand. The moment you do, you own cache invalidation
by hand and it will go stale.

---

## Loading states

Core rule: skeletons for content, spinners for actions. Never a bare centred spinner
for a page of content.

| Situation                                     | What to show                                                                       |
| --------------------------------------------- | ---------------------------------------------------------------------------------- |
| First load of a page, list or card            | Skeleton matching the real layout                                                  |
| Pagination or infinite scroll                 | Skeleton rows appended at the bottom, existing rows stay                           |
| Refetch of data already on screen             | Subtle top progress bar. Never replace visible content with a skeleton             |
| Button action such as save, submit, join clan | Spinner inside the button, button disabled, label kept                             |
| Route navigation                              | Route-level skeleton                                                               |
| Search or filter typing                       | Debounce around three hundred milliseconds, dim the list, keep old results visible |
| Background verification job                   | Status chip reading "Verifying" plus polling. Never block the UI                   |
| Live code editor preview                      | Debounce only. No loader at all                                                    |
| Optimistic action such as vote, like, follow  | No loader. Update immediately, roll back on error                                  |

Skeleton rules:

- A skeleton must match the real component's dimensions. If the layout shifts when
  data arrives, the skeleton is wrong.
- Keep each skeleton beside the component it stands in for, so they stay in sync.
- Use the pending flag for first load. Use the fetching flag only for the background
  refresh indicator. Confusing the two causes flicker.
- Never show a skeleton and a spinner in the same view.
- Do not skeleton anything that reliably resolves in under about three hundred
  milliseconds.

---

## Error handling

Every failure — network, timeout, client error, server error — is normalized into one
shape by the client interceptor before any component sees it. Components never deal
with raw axios errors.

Rules:

- Never show a raw server message to a user unless its code is in the message
  catalog.
- Never swallow an error. An empty catch block is always a bug. If you cannot handle
  it, let it reach the boundary.
- Every mutation handles its error case. No exceptions.
- Every query renders an error state. No exceptions.
- Log the technical detail, show the human message.
- Unknown error codes fall back to one generic message, and that message always comes
  with a retry action.

**Message catalog.** All user-facing error copy lives in one file, keyed by error
code. Never write a message string inline in a component. Every message must say what
happened and what to do next. No stack traces, no error codes shown in the UI, no
bare "Something went wrong."

Where the error surfaces:

| Situation                          | Surface                                                       |
| ---------------------------------- | ------------------------------------------------------------- |
| Form field validation              | Inline, under the field                                       |
| Failed mutation                    | Toast, and keep whatever the user typed                       |
| Failed primary page data           | Full-page error state with a retry button                     |
| Failed secondary widget            | Inline error inside that card, rest of the page still renders |
| Session expired                    | Redirect to sign in, with a toast explaining why              |
| Network offline                    | Persistent global banner                                      |
| Background verification job failed | Status chip on the claim, with the explanation on click       |

---

## Naming

- Components use PascalCase exports with kebab-case filenames.
- Hooks start with "use".
- Service files are named after their domain; their methods read as verb plus noun.
- Booleans read as is, has or should.
- Types use PascalCase with no prefix letter.
- Constants use screaming snake case.

Pick a name once and use it everywhere. If the backend calls it a claim, the frontend
calls it a claim — not a link, not a proof.

---

## Before opening a pull request

- Anything now used in two places with the same logic and data has been extracted
- Nothing extracted purely because it looked similar somewhere else
- Repeated visual values live in tokens, not hardcoded across files
- No axios import outside the API layer
- No URL string outside the endpoints file
- No query key written inline
- Every new query has loading, error and empty states
- Every new mutation handles its error case
- Skeleton matches the real layout with no visible shift
- No user-facing message written inline; it is in the catalog
- No empty catch blocks

---

## Keeping this file alive

This file drifts the moment the code disagrees with it and nobody updates either side.

- If a rule no longer fits, change the rule in a pull request. Do not quietly work
  around it.
- If you add a pattern others will need — a new loader situation, a new error surface
  — add it here in the same pull request.
- Reviewers reject changes that break these rules without an explanation comment.
