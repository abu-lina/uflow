---
ID: 276
Origin: 274
UUID: 9C2E4A17-63BD-4F5A-8E70-21D4B9F3C0A6
Status: Complete
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
- [x] Implement config, specs, global setup, workflow
- [x] Prove the suite discriminates (breaking `cookieAdapter` turned out to be
      inert; disabling the `sb-access-token` write is what makes the suite fail)
- [x] PR, CI, merge
- [x] Capture learning

## Outcome

Merged as PR #474, squash commit `cd9c104c`. Five specs, chromium only, no new
dependencies. CI proof: run `36870418579`, 5/5 green in 14.5s against a
production build with a from-scratch Supabase stack.

The suite is **not** a required status check yet. That call was vindicated
immediately: the first CI run failed on a pre-existing migration collision while
every required check stayed green, so `mergeStateStatus` was `UNSTABLE` rather
than blocking the repo.

### Three pre-existing defects it found

| Defect | Fix |
| --- | --- |
| CSP `connect-src` refused a local or self-hosted Supabase in production builds (only allowed `127.0.0.1` when `isDev`) | added the configured `NEXT_PUBLIC_SUPABASE_URL` in `next.config.js` |
| First workflow draft passed placeholder `NEXT_PUBLIC_*` into the build, which Next inlines into the client bundle; the placeholder slipped past the guard at `src/lib/supabase/client.ts:44` because it is 41 chars and starts with `sb_` | export real local keys before `npm run build` |
| `089_fix_search_food_concepts_junction.sql` and `089_add_food_category_american.sql` shared version `089`, breaking every from-scratch `supabase start` / `db reset` with SQLSTATE 23505 | renamed the later file to `136_` (filename only, migration is idempotent) |

### Correction to the `@supabase/ssr` risk ranking

I had rated `@supabase/ssr` `0.6 -> 0.12` the highest-risk open upgrade. Wrong.
`cookieAdapter` has no `setAll` and its `set`/`remove` are no-ops, so official
SSR cookies are never written; `getUserFromCookie` always logs `ssr_miss` and
falls through to the custom httpOnly `sb-access-token`, which is what actually
carries server-side auth. Breaking `cookieAdapter.getAll` changes nothing
observable. The real risk surface is `/api/auth/set`, `/api/auth/logout` and the
middleware read at `src/middleware.ts:78`.

### Open follow-up

`Header.tsx:266` hardcodes a German `aria-label` ("Profil Dropdown öffnen") in
an i18n'd app, so every locale gets a German label to screen readers. The tests
key off a `data-testid` precisely so fixing that a11y bug won't break them.
