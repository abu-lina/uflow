---
ID: 276
Origin: 274
UUID: 9C2E4A17-63BD-4F5A-8E70-21D4B9F3C0A6
Status: In Progress
Type: change-request
Branch: feature/276-e2e-smoke-suite
Worktree: ../uflow-wt/276-e2e-smoke
Created: 2026-10-01T00:00:00Z
---

# Request 276: Minimal Playwright smoke suite for runtime verification

## Original request

Follow-on from the dependency sweep (requests 269-274). Asked "what's next"; chose
building a Playwright smoke suite over taking another dependency major.

## Why this and not another upgrade

Security alerts are at 0. Every remaining Dependabot PR is discretionary. The sweep
exposed a capability gap that blocks the three highest-value remaining upgrades, and
the same gap is what let a breaking change nearly land unnoticed:

- `lottie-react` 2 -> 3 renamed the `animationData` prop to `src`. Lint, type-check,
  build and all 2678 unit tests passed with the **wrong** prop name (request 274).
- `@supabase/ssr` `0.6 -> 0.12` is six breaking minor lines on auth session cookies.
  Nothing in CI performs a login or a session refresh, so it cannot be verified.
- `next` 15 -> 16 and `tailwindcss` 3 -> 4 are both "does the app still render and
  behave" changes. Unit tests do not answer that.

Playwright is already a devDependency (`@playwright/test` ^1.63.0, `playwright`
^1.60.0), used today by the enrichment scrapers via lazy `await import('playwright')`
in `src/lib/enrichment/delivery-platform/lieferando-client.ts:148` and
`ubereats-client.ts:340`. There is no config and no `e2e` script, so the tooling is
present but the harness was never built. Cost is zero new dependencies.

## Ground truth established before briefing

### Auth is email + password, so no email interception is needed

`src/app/(public)/login/LoginPageContent.tsx:74` calls `signInWithEmailConfirmation`
(`src/lib/auth.ts:172`), which first POSTs `/api/check-email-exists` and only then
calls `supabase.auth.signInWithPassword`. A **confirmed** user is therefore required;
an unconfirmed one short-circuits with `EMAIL_NOT_FOUND`.

Local `supabase/config.toml` sets `[auth.email] enable_confirmations = false` and
`minimum_password_length = 6`.

### The cookie scheme is hybrid, and that is the real risk surface

| Piece | Detail |
| --- | --- |
| `src/lib/supabase/server.ts` | `createServerClient` with `cookieOptions: { name: 'sb' }` (custom prefix) |
| `src/lib/supabase/cookieAdapter.ts` | implements legacy `get`/`set`/`remove` **and** `getAll`; has **no `setAll`**; `set`/`remove` are no-ops |
| `src/middleware.ts:78` | gates on `req.cookies.get('sb-access-token')`, a custom httpOnly cookie |
| `src/app/api/auth/set/route.ts:12` | sets `sb-access-token` explicitly |
| `src/app/api/auth/logout/route.ts:5` | clears it |
| `src/lib/supabase/getUserFromCookie.ts:31` | documents a fallback chain: official SSR cookie first, then custom `sb-access-token` |

`@supabase/ssr` moved from `get`/`set`/`remove` to `getAll`/`setAll`. This adapter has
no `setAll`, so the 0.12 upgrade lands squarely on it. That is precisely what this
suite must be able to catch.

### Collisions ruled out

- vitest `include` is `./src/**` and `./tests/**` only, so an `e2e/` directory is
  safe. Naming it `tests/` **would** collide and make the unit runner execute
  Playwright specs.
- `tsconfig.json` includes `**/*.ts`, so `e2e/**` is type-checked by
  `npm run type-check`. Intended.
- CI pins actions by SHA: `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1`
  (v7.0.1), `actions/setup-node@820762786026740c76f36085b0efc47a31fe5020` (v7.0.0),
  `NODE_VERSION: '22'`.

## Scope

Four behaviours, chosen because unit tests structurally cannot see them:

1. Public pages (`/food`, `/`) render real content with no uncaught page errors.
2. Login with email + password reaches an authenticated state.
3. **Session survives a full page reload** (the actual `@supabase/ssr` contract: a
   cookie round-trip through middleware and server rendering).
4. Logout clears the session.

## Out of scope

- Promoting the job to a required status check. It runs non-blocking first.
- Creating `supabase/seed.sql` (referenced by `config.toml` `db.seed.sql_paths` but
  absent). Noted, deliberately not fixed here.
- Any `@supabase/ssr`, Next 16 or Tailwind v4 upgrade. This builds the gate only.

## Decisions

- **Test user via Supabase Admin API in global setup, not raw SQL.** Inserting into
  `auth.users` means replicating password hashing and internal columns, which breaks
  across Supabase releases. `admin.createUser({ email_confirm: true })` is stable and
  supported, and avoids changing `db reset` behaviour for every developer.
- **Local Supabase stack**, keys read dynamically from `supabase status -o json`. No
  secrets committed, no shared/remote project touched.
- **Production server in CI, dev server locally.** The suite guards a framework major,
  so CI must exercise a real production build; local keeps fast iteration.
- **Chromium only.** Smoke, not a compatibility matrix.
- **Not a required check yet.** Adding an unproven job to a ruleset with
  `strict_required_status_checks_policy: true` would block every merge on its first
  flake.

## Status

- [x] Investigate auth, cookies, CI, runner collisions
- [x] Branch + tracking
- [ ] Implement config, specs, global setup, workflow
- [ ] Prove the suite discriminates (break `cookieAdapter`, confirm failure)
- [ ] PR, CI, merge
- [ ] Capture learning
