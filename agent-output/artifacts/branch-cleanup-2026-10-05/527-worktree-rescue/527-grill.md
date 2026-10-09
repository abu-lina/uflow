### Phase: Grill — Done

- Issue: #527
- Worktree: /Users/NARAFIQ/Projects/uflow-wt/527-zod-v4-migration
- Branch: refactor/527-zod-v4-migration
- Flow: refactor / Grill -> Implement -> Code Review

## Headline

Three things change the plan.

1. The 400 body **does** change. `details` is a public response field on 3 routes, and the v4 issue object differs from v3 in field names on every single issue code, not "most cases". v4 also adds a `pattern` field carrying the full validation regex source into the public body. This needs a user decision (Q1).
2. The two `TS2769` errors have the **same** cause, not two. The issue guessed they might differ. They don't: both are `errorMap` dropped from schema params.
3. The blast radius is larger than 8 sites. Five call sites already use `.issues` and compile clean today, yet their client-visible message text changes under v4. Plus `src/__tests__/setup.ts:79` globally mocks `zod` with a stub exposing `errors`, not `issues`.

I could not run the test suite: the worktree has no `node_modules`, and #506's CI logs have expired (`gh run view --job 111374610842 --log` returns empty). The identity of the 7 failing tests is therefore **unverified**; see Open questions.

## Method and sources (Q4)

Two independent sources, neither the error text:

- The real migration guide, fetched raw: `https://raw.githubusercontent.com/colinhacks/zod/main/packages/docs/content/v4/changelog.mdx` (929 lines). Relied on line 80 (`drops errorMap`), 259-261 (`drops .errors`, "was an alias for `.issues` in v3 but has been removed"), 247-255 (`.format()`/`.flatten()` deprecated, not removed), 177-231 (issue format renames), 302-331 (`.email()` etc deprecated, moved to top level), 393-427 (`.default()` changes), 441-465 (`.strict()`/`.passthrough()` deprecated), 692-704 (`z.record()` arity).
- An empirical A/B probe. I installed `zod@3.25.76` and `zod@4.6.5` side by side in `/tmp/z3` and `/tmp/zodprobe` and diffed the actual issue objects for the exact schema shapes this repo uses. This is where the real contract diff came from; the changelog's "each issue remains structurally similar... identical, in most cases" (line 222) understates it badly.

## Q1 — The API contract. The body changes, and here is exactly how

### Which routes actually emit zod issues to the client

Only 3 of the 5, not 5:

| Route                                          | Line      | What reaches the client                                                                                      |
| ---------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------ |
| `src/app/api/admin/badges/verify/route.ts`     | 61        | `details: validation.error.errors` — raw issue array in the 400 body                                         |
| `src/app/api/admin/badges/unverify/route.ts`   | 60        | `details: validation.error.errors` — raw issue array in the 400 body                                         |
| `src/app/api/waitlist/update/route.ts`         | 77        | `error.details: validation.error.errors` — raw issue array in the 400 body                                   |
| `src/app/api/waitlist/join/route.ts`           | 55        | `console.log` only. Body is the hardcoded string `'Please enter a valid email address'`. **No body change.** |
| `src/app/api/waitlist/subscribe-city/route.ts` | 63, 64-65 | `console.log` plus `firstError.message`. No issue array in the body.                                         |

### The shape diff, measured not assumed

Probe against `z.object({ badgeId: z.string().uuid('Invalid badge ID format'), reason: z.string() })`, which is literally `verifyBadgeSchema`:

```
v3.25.76  {"validation":"uuid","code":"invalid_string","message":"Invalid","path":["badgeId"]}
v4.6.5    {"origin":"string","code":"invalid_format","format":"uuid",
           "pattern":"/^([0-9a-fA-F]{8}-...)$/","path":["badgeId"],"message":"Invalid"}
```

Full per-code diff I measured (v3 -> v4):

| Case                  | v3                                                                              | v4                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `.uuid()`             | `code:invalid_string`, `validation:'uuid'`                                      | `code:invalid_format`, `format:'uuid'`, **new** `origin`, **new** `pattern` (full regex)             |
| `.email()`            | `code:invalid_string`, `validation:'email'`, msg `Invalid email`                | `code:invalid_format`, `format:'email'`, `pattern`, msg `Invalid email address`                      |
| `.url()`              | `code:invalid_string`, msg `Invalid url`                                        | `code:invalid_format`, msg `Invalid URL`                                                             |
| wrong type            | `expected`,`received`, msg `Expected string, received number`                   | **`received` dropped**, msg `Invalid input: expected string, received number`                        |
| missing key           | msg `Required`                                                                  | msg `Invalid input: expected string, received undefined`                                             |
| `.max(3)`             | `type:'string'`,`exact:false`, msg `String must contain at most 3 character(s)` | `origin:'string'`, **`type`/`exact` dropped**, msg `Too big: expected string to have <=3 characters` |
| `.min(2)`             | msg `String must contain at least 2 character(s)`                               | msg `Too small: expected string to have >=2 characters`                                              |
| array `.max(1)`       | `type:'array'`, msg `Array must contain at most 1 element(s)`                   | `origin:'array'`, msg `Too big: expected array to have <=1 items`                                    |
| number `.min(0)`      | msg `Number must be greater than or equal to 0`                                 | msg `Too small: expected number to be >=0`                                                           |
| `z.enum` miss         | `code:invalid_enum_value`, `options:[...]`, `received`                          | `code:invalid_value`, `values:[...]`, **`received` dropped**                                         |
| `.strict()` extra key | msg `Unrecognized key(s) in object: 'b'`                                        | msg `Unrecognized key: "b"`                                                                          |
| `.datetime()`         | `code:invalid_string`, msg `Invalid datetime`                                   | `code:invalid_format`, `format:'datetime'`, `pattern`, msg `Invalid ISO datetime`                    |

So: **not byte-identical, on any code.** Every `code` for string formats is renamed, two fields (`received`, `validation`, `type`, `exact`) disappear, two (`origin`, `format`, `pattern`) appear, and every default message string is rewritten.

### Who consumes these bodies

I grepped for consumers of `details` from these 3 routes and found **none**. The `.details` hits in `src/app/auth/confirm/page.tsx:63`, `src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx:173` and `src/utils/errorUtils.ts:53-54` are Supabase `PostgrestError.details` (a string), on different endpoints. No test asserts on these three routes' `details` either. So the shape change breaks nothing _in this repo_ today. It is still a public API change on 3 endpoints, and `pattern` leaking a regex into a 400 body is gratuitous surface.

### Recommendation

**Do not return raw zod issues, and do not replicate v3 byte-for-byte either.** Byte-identical replication is impossible without fabricating data v4 no longer produces (`received` is simply gone).

Add one deep module: a single function in `src/lib/validations/` that maps a `ZodError` to a narrow, stable, zod-agnostic shape, and call it from all 3 sites.

```ts
// src/lib/validations/validationDetails.ts
export type ValidationDetail = { path: string; message: string };
export function toValidationDetails(error: z.ZodError): ValidationDetail[];
```

Why this shape and not raw issues, in `codebase-design` terms: the HTTP body is a **seam** between this app and its clients, and right now zod's internal issue type _is_ that seam's interface. That is why a dependency bump turned into an API change. Putting one small interface at the seam gives **locality** (the next zod major touches one file, not 3 routes) and **leverage** (3 call sites, one definition). The deletion test passes: delete it and the zod-version coupling reappears at every route. `path` flattened to a dot string drops v4's `PropertyKey[]` (which can now contain symbols, per changelog line 189) and is what a client can actually use.

Cost: the 400 body on those 3 endpoints changes from zod's issue array to `[{path, message}]`. That is a deliberate, documented change, which the issue's own acceptance criterion already permits ("or the change is deliberate and noted").

**This is the one decision I want confirmed before Implement starts.** Alternative if you'd rather keep the diff minimal: change `.errors` to `.issues` and ship the raw v4 shape, accepting that 3 public 400 bodies change silently and that `pattern` goes out on the wire. I don't recommend it.

## Q2 — The two TS2769 errors. Same cause, both of them

The issue speculated they "are not necessarily the same cause". They are the same cause. Current code:

`src/lib/validations/adminSchemas.ts:16-20`

```ts
    reviewStatus: z.enum(['approved', 'rejected', 'needs_revision'], {
      errorMap: () => ({
        message: 'reviewStatus must be one of: approved, rejected, needs_revision',
      }),
    }),
```

`src/lib/validations/adminSchemas.ts:167-171` is the same five lines inside `communityServiceReviewUpdateSchema`.

Cause: changelog line 80, "drops `errorMap`". The schema-level params object no longer accepts `errorMap`; v4 replaces it with `error`, which takes either a string or a function. Nothing about the enum builder itself changed; the overload fails only on the params object.

Fix for both, verified by probe:

```ts
    reviewStatus: z.enum(['approved', 'rejected', 'needs_revision'], {
      error: 'reviewStatus must be one of: approved, rejected, needs_revision',
    }),
```

Probe output, both the string form and the `error: () => ({ message })` function form:

```
[{"code":"invalid_value","values":["approved","rejected","needs_revision"],
  "path":["reviewStatus"],"message":"reviewStatus must be one of: approved, rejected, needs_revision"}]
```

The message is preserved exactly, so `src/__tests__/lib/validations/adminSchemas-cs.test.ts:177` (`expect(result.error?.issues[0].message).toContain('reviewStatus must be one of: ...')`) keeps passing untouched. Prefer the plain string form: shorter, and the function form's return-object shape is itself a v4-changed surface.

## Q3 — True blast radius

11 files import zod: the 5 named routes, plus `src/app/api/city-interest/subscribe/route.ts`, `src/app/api/providers/route.ts`, `src/lib/validations/{waitlistSchemas,submissionSchemas,adminSchemas,auth}.ts`.

### A. Breaks the type-check (what the issue found)

- `.errors` -> `.issues`, 8 occurrences across 5 files: `badges/verify:61`, `badges/unverify:60`, `waitlist/join:55`, `waitlist/subscribe-city:63,64`, `waitlist/update:71,72,77`.
- `errorMap` -> `error`, `adminSchemas.ts:17` and `:168`.

### B. Compiles clean today, behavior changes anyway (the real risk, zero type errors)

These five sites already use `.issues` and will not raise a single diagnostic, yet their client-visible 400 text changes:

- `src/app/api/providers/route.ts:75` — `{ error: validation.error.issues[0]?.message ?? 'Invalid request body' }`. This schema (lines 7-48) passes **no custom messages at all** across ~25 fields and ends in `.strict()`. So every possible 400 message from this endpoint is a zod default, and every one of them is rewritten in v4: `String must contain at most 200 character(s)` -> `Too big: expected string to have <=200 characters`, `Required` -> `Invalid input: expected string, received undefined`, `Unrecognized key(s) in object: 'x'` -> `Unrecognized key: "x"`, `Invalid uuid` -> `Invalid UUID`. **This is the single biggest user-visible change in the migration and the issue does not mention this file.**
- `src/app/api/city-interest/subscribe/route.ts:32` — `cityInterestBodySchema` is `{ cityName: z.string() }`, no custom message, so its 400 text changes (`Required` -> `Invalid input: ...`).
- `src/app/api/city-interest/subscribe/route.ts:44` — custom message `'Invalid email format'`, unchanged.
- `src/app/api/waitlist/subscribe-city/route.ts:65` and `src/app/api/waitlist/update/route.ts:73` — both read `firstError.message`. Their schemas (`subscribe-city/route.ts:20-24`, `waitlistSchemas.ts:8-14`) give custom messages on every field except `waitlistToken: z.string().optional()` / `has_seen_early_access` etc, so the common paths are unchanged. Low risk, worth one test each.
- `src/lib/validations/submissionSchemas.ts:98-99` — `firstIssueField(error: z.ZodError)` reads `error.issues[0]?.path[0]`. Still fine; note v4 types `path` as `PropertyKey[]`, and the existing `String(...)` wrapper already handles that.

### C. Deprecated but working, verified against 4.6.5 at runtime

Leave these alone unless lint escalates deprecation to an error. Keeping them out keeps the diff reviewable.

- `z.string().uuid()` / `.email()` / `.url()`, ~12 sites in `adminSchemas.ts` (lines 50, 74, 81, 83, 112, 116, 146, 151, 153, 155) and `providers/route.ts` (19, 33-35, 46). Changelog 302-331: method forms "still exist and work as before, but are now deprecated". Top-level `z.uuid()`/`z.email()`/`z.url()` are the new form.
- `z.string().datetime({ offset: true })`, `adminSchemas.ts:22` and `:173`. Probed: still parses `2024-01-01T00:00:00+02:00` -> `true`. New form is `z.iso.datetime()`.
- `.strict()`, `providers/route.ts:48`. Changelog 441. Works; `z.strictObject()` is the new form.
- `ctx.addIssue(...)`, `submissionSchemas.ts:70`. Changelog 263, deprecated, works.
- `z.ZodIssueCode.custom`, `submissionSchemas.ts:71`. **Verified present in 4.6.5**; the object still exports `custom` (alongside the renamed `invalid_format`, `invalid_value`, `invalid_key`, `invalid_element`). No change needed.

### D. Verified absent, so not in scope

Grepped across all 11 zod files: no `.format()`, no `.flatten()`, no `.formErrors`, no `invalid_type_error`, no `required_error`, no `z.record()`, no `z.nativeEnum`, no `z.function`, no `.deepPartial()`, no `.merge()`, no `.passthrough()`, no `.catch()` on a schema (the 40 `.catch(` hits are all Promise `.catch`), no `z.coerce`. Each of these is a listed v4 break and none applies here.

### E. One more thing the issue misses entirely

`src/__tests__/setup.ts:79-87` globally mocks zod, and `vitest.config.ts:17` registers that file as `setupFiles` for the whole suite:

```ts
vi.mock('zod', () => ({
  z: {
    object: mockObject,
    string: mockString,
    ZodError: class extends Error {
      errors = [{ path: [], message: 'Mock error' }];
    },
  },
}));
```

Two problems. The stub's `ZodError` exposes `errors`, the property v4 removed, so it stops matching the production shape and any test leaning on it goes stale. And the stub `z` has no `enum`, `array`, `boolean` or `number`, so any test file that actually gets this mock and imports a real schema cannot work.

**Hypothesis, not verified:** this global mock is implicated in some of the 7 failures on #506. The discriminating check is one command, and the Implement phase should run it first: `npm ci && npx vitest run src/__tests__/lib/validations/adminSchemas.test.ts`. If it passes, the mock is not reaching those files and the fix is just `errors` -> `issues` in the stub. If it fails on `z.enum is not a function`, the mock is a pre-existing landmine and deleting the `vi.mock('zod', ...)` block belongs in this issue's scope.

### Per-field risk worth one targeted test

`providers/route.ts:26-27`, `z.number().min(-90).max(90).nullable().optional().default(null)`. Changelog 393-427 changed `.default()` to short-circuit on `undefined` and to require the default be assignable to the **output** type, and separately changed how defaults apply inside optional fields. `null` is assignable to the output type here so I expect no break, but this is the one `.default()` shape in the repo where the new semantics could bite. The other 17 defaults (`''`, `false`, `true`, `[]`) are trivially assignable.

## Q5 — DB enum, verified live against Supabase

The `reviewStatus` enums at `adminSchemas.ts:16` and `:167` are **not** pure request-shape validation; they encode the `public.review_status` DB enum. Verified against the running local Supabase instance (`supabase status` reports it up), not the migration files:

```
$ psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -tAc \
  "SELECT t.typname, string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) ..."
review_status|pending,approved,rejected,needs_revision,removed_by_owner
```

Five DB values; both zod schemas accept only three. The omission of `pending` and `removed_by_owner` is deliberate (an admin review action cannot set either), and `adminSchemas-cs.test.ts:172-180` locks that in by asserting `reviewStatus: 'pending'` is rejected. **Constraint for Implement: the value list `['approved','rejected','needs_revision']` must not change, in either schema.** The migration touches only the params object.

## Q6 — Version pin

- Pin exactly `zod@4.6.5`. That is what Dependabot PR #506 targets (`chore(deps): bump zod from 3.25.76 to 4.6.5`, branch `dependabot/npm_and_yarn/zod-4.6.5`), so matching it is what lets #506 close.
- `npm view zod time` gives `4.6.5 -> 2026-09-13T23:25:14Z`. Today is 2026-10-04. **21 days old**, clears the 7-day minimum.
- `package.json:102` currently reads `"zod": "^3.24.3"`, resolving to 3.25.76. Target `"zod": "^4.6.5"` to stay consistent with the caret style used throughout the file.
- Note for Implement: the worktree has **no `node_modules`**. Run `npm ci` before anything else, which is also what unblocks identifying the 7 failing tests.

## Open questions for the user

1. **Error body shape (blocking).** Confirm the recommendation in Q1: introduce `toValidationDetails()` and return `[{path, message}]` from the 3 routes that currently emit raw zod issues, accepting a deliberate, documented change to those 400 bodies. The alternative is shipping the raw v4 issue array, which changes the same 3 bodies anyway, just without the stable interface, and puts a regex `pattern` on the wire. Nothing in this repo consumes either shape, so the risk is only to external clients. **Are there external consumers of `/api/admin/badges/verify`, `/api/admin/badges/unverify` or `/api/waitlist/update` outside this repo?** If no, this is cheap either way and I'd take the mapping.
2. **Deprecation sweep, in or out?** `z.string().email()` and friends work in 4.6.5 but are deprecated at ~15 sites. I recommend **out of scope** for #527 (keeps the diff to the breaking changes, keeps review tight) and a follow-up issue for the sweep. Confirm, or say you want it folded in.
3. **The global zod mock.** If the check in Q3-E shows `src/__tests__/setup.ts:79-87` is actively breaking test files, do you want it deleted in this issue, or a separate one? My call: delete it here, because leaving a stub advertising the removed `errors` property inside a zod-v4 migration is worse than the diff size.

## Acceptance criteria (ready to paste into the issue body)

- `zod` pinned to `^4.6.5` in `package.json` with `package-lock.json` regenerated; `npm ls zod` reports a single 4.6.5 resolution and no duplicate 3.x tree.
- `npm run type-check` passes with zero errors. No `@ts-expect-error`, `@ts-ignore`, `any` cast or `eslint-disable` added to get there, and no warning cap raised.
- `errorMap` is gone from `adminSchemas.ts:17` and `:168`, replaced by `error`. The accepted value list in both `reviewStatus` enums is still exactly `['approved','rejected','needs_revision']`, a verified 3-of-5 subset of the live `public.review_status` DB enum (`pending,approved,rejected,needs_revision,removed_by_owner`), and `adminSchemas-cs.test.ts:172-180` still passes unmodified.
- The error message `reviewStatus must be one of: approved, rejected, needs_revision` is byte-identical in the response, asserted by the existing test at `adminSchemas-cs.test.ts:177`.
- All 8 `.errors` reads are gone. The 3 routes that put issues in a public 400 body (`badges/verify:61`, `badges/unverify:60`, `waitlist/update:77`) go through one shared mapping helper rather than each reaching into zod's issue type. Decision recorded in the PR body with the before/after JSON for one example body.
- `src/app/api/providers/route.ts` has at least one test pinning its 400 `error` message for a field with no custom message, acknowledging the v4 default-message rewrite. Either the new text is asserted or a custom message is added to hold the old text; state which and why.
- `src/app/api/providers/route.ts:26-27` (`z.number()...nullable().optional().default(null)`) has a test covering both the omitted-key and explicit-`null` inputs, guarding the v4 `.default()` semantics change.
- `src/__tests__/setup.ts` no longer advertises a `ZodError` with an `errors` property.
- The 7 tests failing on #506 are **enumerated by name in the PR body** and all pass. No test is skipped, deleted or weakened to achieve it, and no existing test regresses. Full suite green.
- `npm run lint` and `npm run build` pass.
- Every `ci.yml` job green **except `security/snyk`**, which fails on every PR in this repo with "You have used your limit of private tests." That is a quota message, not a vulnerability finding, needs a human billing action, and is tracked in #529. Do not fix, disable, skip or weaken the Snyk check to turn it green.
- `docs/ai/LEARNINGS.md` gets one entry, per the AGENTS.md workflow checkpoint.
