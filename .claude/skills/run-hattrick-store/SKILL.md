---
name: run-hattrick-store
description: Build, run, and drive the HATTRICK storefront (Next.js 16 App Router). Use when asked to start hattrick-store, run its dev server, build it, take a screenshot of the storefront UI, or click/hover through a page.
---

Web app driven two ways: a fast no-browser `smoke` check over `curl`/`fetch`
for "is it up and serving the right content," and a real headless-Chromium
driver (`.claude/skills/run-hattrick-store/driver.mjs`, via Playwright) for
anything that needs a screenshot or an actual click/hover. Start here, not
with `chromium-cli` — it isn't installed in this environment (checked this
session; `which chromium-cli` → not found).

All paths below are relative to the repo root. This skill is specific to
Claude Code — see `docs/agents/` for the shared, agent-agnostic project
instructions (`AGENTS.md` at the repo root is the primary source for any
agent, including Codex).

**`driver.mjs` is not currently tracked in Git** (confirmed with
`git ls-files` — it only exists in this local working tree). Treat it as a
pending dependency: don't assume another agent or environment has it, and
don't run it until you've confirmed what it actually points at — see below.

## ⚠️ Two different environments — know which one you're pointing at

HATTRICK has **two** completely separate ways to run the app, and they are
not interchangeable:

1. **`npm run dev` / `npm run build` / `npm run start`** — reads `.env.local`,
   which points `NEXT_PUBLIC_SUPABASE_URL` at the **real, live Supabase
   project this store runs on in production**. Anything you write through
   this server (creating a product, submitting the admin login form, a
   `POST`/`PUT`/`DELETE` against `/api/admin/*`) **writes to real production
   data**, visible to real customers. **A plain GET is not risk-free
   either**: `smoke`/`screenshot`/`megamenu` against this environment still
   make the Next.js server run real queries against **production** Supabase
   to render the page — no write happens, but it is real production read
   traffic and real production load, not a no-op. Don't point this driver
   at environment 1 — by default or otherwise — unless the user explicitly
   asked for that specific read against production. Don't improvise a write
   against this environment under any circumstance without the user
   explicitly asking for that specific write.
2. **`npm run dev:test` / `npm run build:test` + `npm run start:test`** —
   a fully isolated environment against a **local** Supabase instance
   (Docker), never production. This is the environment to use for anything
   that mutates data, and it's mandatory for any test that writes. See
   "Isolated test environment" below.

Both are real `package.json` scripts; neither is hypothetical. If a task
needs a write (creating/editing a product, logging into the admin panel,
registering a sale, changing a setting), use environment 2, never
environment 1 — don't ask the user whether it's safe to write against
`npm run dev`; it isn't, by design.

## Isolated test environment (mandatory for anything that writes)

```bash
npm run supabase:start       # Docker: API 127.0.0.1:54321, DB 54322, Studio 54323
npm run test:env:generate    # writes .env.test.local from the LOCAL stack status -- never copies .env.local
npm run build:test           # next build against that env, separate distDir (.next-test)
npm run start:test           # serves that build on port 3100 (override with TEST_SERVER_PORT)
# or, for a dev-mode equivalent of the above build/start pair:
npm run dev:test
```

A guard (`scripts/test-env.mjs`) verifies the environment variables actually
point at the local stack before any write is allowed — it fails closed if it
can't confirm isolation. Never bypass it, and never hand-edit
`.env.test.local` to point anywhere but the local stack.

`driver.mjs`'s default `BASE_URL` is `http://localhost:3000` (environment 1,
dev mode). **To drive the isolated environment, override it**:

```bash
BASE_URL=http://localhost:3100 node .claude/skills/run-hattrick-store/driver.mjs smoke
```

Full detail (suites, scripts, reset-between-runs caveats) in
`docs/agents/TESTING.md`.

## Read-only vs. mutating scenarios

`driver.mjs` itself (`smoke`, `screenshot`, `megamenu`) only performs `GET`
navigation and hovers — confirmed by reading the file (static read only,
not executed in this update): there is no `POST`/`PUT`/`DELETE`/
form-submission anywhere in it, and it reads no credentials itself (only
`process.env.BASE_URL`). It cannot mutate data on its own, against either
environment. That said, a GET against environment 1 is still a real
production read (see above) — "mutating vs. read-only" is not the same
question as "safe to point at production vs. not." The separate risk of an
agent improvising a write (a `curl -X POST`, a form submission) by hand
against environment 1 instead of environment 2 still applies; if a task
genuinely needs a mutation (creating a product, logging in, registering a
sale), run it against the isolated environment (port 3100) through the
app's own admin API, with the guard active — never against `.env.local`.

**Do not run `driver.mjs` — for any command, including `smoke` — until
you've confirmed what `BASE_URL` actually resolves to for that invocation.**
It is not versioned in Git (see above) and defaults to environment 1
(production-backed). Resolve the ambiguity before invoking it: either
confirm with the user that a production read is what's wanted for this
specific task, or set `BASE_URL=http://localhost:3100` and confirm the
isolated environment (`build:test`/`start:test`) is actually up first. Don't
run it on the strength of "it's just a GET" alone.

## Prerequisites

Node v24 (whatever `node --version` reports; nothing pinned lower was
tested). No OS packages needed — this was run and verified on Windows
(Git Bash), not Linux; see Gotchas for the one Windows-specific trap.

```bash
npx playwright install chromium   # one-time per machine, ~120 MB
```

## Setup

```bash
npm install          # playwright is already a devDependency, this installs it
```

`.env.local` must already exist at the repo root for environment 1 (it does
in this repo; it's git-ignored). If it's ever missing, `npm run dev` still
boots but every page that reads from Supabase will throw. Environment 2 does
not need `.env.local` at all — see "Isolated test environment" above.

## Build

```bash
npm run build         # next build -- also what CI/Vercel runs (environment 1, .env.local)
npx tsc --noEmit -p .  # type-check without emitting; run this too, build alone can pass with stale types in a long session
```

## Run (agent path)

Against environment 1 (read-only navigation only):

```bash
npm run dev &
timeout 60 bash -c 'until curl -sf http://localhost:3000/ -o /dev/null; do sleep 1; done'
```

Against environment 2 (isolated, required for anything that writes) — see
"Isolated test environment" above for the full sequence, then point
`BASE_URL` at port 3100.

Then drive it:

```bash
node .claude/skills/run-hattrick-store/driver.mjs smoke
MSYS_NO_PATHCONV=1 node .claude/skills/run-hattrick-store/driver.mjs screenshot /categoria/combos out.png
node .claude/skills/run-hattrick-store/driver.mjs megamenu FUTBOL out.png
```

Screenshots land wherever you pass as the `out.png` path (relative paths
resolve against the repo root).

| command | what it does |
|---|---|
| `smoke` | No browser. Hits `/`, a product page, a category page, `/buscar`; checks status + expected text in each. Takes ~1s. Use this first. |
| `screenshot <path> [out.png]` | Launches Chromium, navigates to `BASE_URL<path>`, waits for network-idle, screenshots. Prints the page `<title>` and any non-benign console errors. |
| `megamenu <nav-label> [out.png]` | Navigates home, hovers the given top-nav label (e.g. `FUTBOL`, `BASKET`, `IMPORTADOS`), screenshots the mega-menu that opens. |

`BASE_URL` env var overrides the default `http://localhost:3000` — set it to
`http://localhost:3100` for the isolated environment, or to any other
`next start` build you've pointed at another port.

**Known staleness, not verified this session (static read only, `driver.mjs`
was not executed):** `smoke`'s hardcoded checks (`/producto/palmeiras-alternativa`,
`/categoria/futbol`) and `megamenu`'s example labels (`FUTBOL`, `BASKET`,
`IMPORTADOS`) assume specific catalog content that may no longer match
either environment's current data after many phases of catalog/category
changes. Treat a `smoke` failure on those specific checks as "verify the
fixture still exists" before assuming a real regression.

**Admin area (`/gestion-ssjblue/**`) is out of scope for this driver.**
Every admin page redirects to `/gestion-ssjblue/login` without a valid
session cookie, and that cookie is a signed JWT (`ADMIN_SESSION_SECRET`) —
there's no safe way to mint one from here without handling a secret
directly, which this environment's permission layer blocks by design. The
isolated test environment has its own known test admin credentials for
integration tests (see `docs/agents/TESTING.md` / `tests/integration/`) —
use those there, never real admin credentials, and never against
environment 1. If a task genuinely needs an admin-area screenshot against
real data, ask the user to log in and describe/share what they see, or to
hand you a valid session cookie value.

## Run (human path)

```bash
npm run dev   # → http://localhost:3000, Ctrl-C to stop
```

## Test

There **is** an automated test suite — see `docs/agents/TESTING.md` for the
full, current picture:

- `npm test` — 149 unit tests (`node --test lib/*.test.ts`), no server needed.
- `tests/integration/*.mjs` — 41 integration scenarios + 18 Playwright/prefetch
  scenarios, all requiring the isolated environment (`build:test` +
  `start:test`, guard active) to be running first.

For a quick manual check of this skill's own concern (does the storefront
render), `npm run build`, `npx tsc --noEmit -p .`, and the `smoke` driver
command above are a fast stand-in — run all three before calling a UI change
done, in addition to (not instead of) the real suites above when the change
touches anything they cover.

---

## Gotchas

- **Git Bash on Windows mangles leading-slash arguments into Windows paths.**
  `node driver.mjs screenshot /categoria/combos` fails with `Cannot navigate
  to invalid URL` because Git Bash rewrites `/categoria/combos` into
  `C:/Program Files/Git/categoria/combos` before Node ever sees it. Fix:
  prefix the command with `MSYS_NO_PATHCONV=1`. Only `screenshot`'s `<path>`
  arg is affected (it starts with `/`); `megamenu`'s label arg doesn't need
  the prefix.
- **`chromium-cli` is not installed here.** Don't reach for it per the
  general `/run` skill's web-app example — use this project's
  `driver.mjs` (Playwright) instead.
- **Two CSP console errors on every page in dev mode are expected, not a
  bug:** `Loading the script 'https://va.vercel-scripts.com/...script.debug.js'
  violates ... Content Security Policy`. That's Vercel Analytics' own
  dev-mode debug script, blocked by this project's strict CSP
  (`next.config.ts`) because it's hosted off-origin. It never loads in
  production (Analytics serves same-origin there via `/_vercel/insights/*`,
  already covered by `'self'`). `driver.mjs` already filters this exact
  string out of the errors it reports — if you're grepping console output
  yourself, expect to see it and ignore it.
- **Nav labels aren't unique on the page.** `getByRole("link", { name:
  "FUTBOL" })` resolves to 3 elements (top nav, home hero tile, footer) and
  throws a Playwright strict-mode violation. Scope to
  `getByRole("navigation", { name: "Navegación principal" })` first, like
  `megamenu()` in the driver does.
- **`AGENTS.md` shows as modified after `npm run dev` runs.** That's
  expected and documented in the file's own header — `next dev` regenerates
  the block between `<!-- BEGIN:nextjs-agent-rules -->` and
  `<!-- END:nextjs-agent-rules -->` on every boot, and only that block.
  Everything else in `AGENTS.md` (the shared HATTRICK instructions below
  that block) is untouched by this regeneration. Commit the regenerated
  block along with your real change instead of trying to revert it;
  reverting just re-creates the same uncommitted diff next time the dev
  server starts.
