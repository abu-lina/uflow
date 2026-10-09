### Phase: Code Review — Done

- Issue: #527
- Worktree: /Users/NARAFIQ/Projects/uflow-wt/527-zod-v4-migration
- Branch: refactor/527-zod-v4-migration
- Flow: refactor / Grill -> Implement -> Code Review

Reviewed `504d3ec9` / `git diff main...HEAD` (16 files, +403/-198) against the five settled decisions in the brief, both axes of the `code-review` skill. No `run_subagent` available to me, so I ran Standards and Spec myself and kept them unmerged below, per the skill's "Why two axes".

**No Blockers.** One Major, a required cleanup that was not done and was undercounted in the Implement report. Everything else is Minor or Nit.

## Gates, re-run here (not taken on trust)

```
npm run type-check   -> 0 errors
npx eslint .         -> 0 errors, 131 warnings  (cap 131, byte-identical to main)
npx vitest run       -> 301 files passed | 1 skipped; 2725 tests passed | 24 skipped | 0 failed
npm ls zod           -> direct zod@4.6.5, exact pin; no 3.x anywhere in the tree
```

Grep for added weakeners (`@ts-ignore`, `@ts-expect-error`, `eslint-disable`, `--max-warnings`, `.skip(`, `.only(`, `xit(`) across the diff: **none**. Grep for removed `it(`/`test(`/`describe(` lines: **none**. Item 7 clean.

## Verified clean, so nobody re-chases them

- **Item 1, envelope preservation.** `git diff -w main...HEAD` on the three helper sites shows the only substantive change is the value handed to `details`. badges/verify (`route.ts:53-58`) and badges/unverify (`route.ts:52-57`) keep `{ error: 'Validation failed', details: ... }` at `{ status: 400 }`; waitlist/update (`route.ts:69-80`) keeps `{ data: null, error: { message: errorMessage, details: ... } }` at 400, with `message` still sourced from `issues[0].message`. Status, JSON keys and every sibling field are identical. Only the array element shape moved.
- **Item 2.** `src/app/api/providers/route.ts` and `src/app/api/city-interest/subscribe/route.ts` are **not in the diff at all**. Single message string preserved by construction; the text change comes from zod itself. Honored exactly, no overreach.
- **Item 3, no deprecation creep.** `adminSchemas.ts` diff touches only the two params objects. `.uuid()`, `.email()`, `.url()`, `.datetime({ offset: true })` and `providers/route.ts`'s `.strict()` are untouched. Nothing from #531 leaked in.
- **Item 5, enum subset.** Both lists still read exactly `['approved','rejected','needs_revision']`. Deliberate 3-of-5 against live `public.review_status` intact.
- **Item 8, lockfile.** The ~25 `devOptional`->`dev` / added `"dev": true` hunks on esbuild, `@types/node`, `undici-types` are **not** zod-related. I reproduced them by running `npm install --package-lock-only` against _main's own_ `package.json` and `package-lock.json` with no zod change: identical churn. Pre-existing lockfile staleness on main that any install normalizes. Not a finding, and not worth reverting.
- **Item 6 preconditions.** No `vi.mock('zod'` survives anywhere under `src/` or `tests/`, so all remaining `vi.unmock('zod')` calls are genuine no-ops. None is load-bearing, none unmocks anything else.

## Major

### M1 (Spec) — The `vi.unmock('zod')` cleanup the user asked for is missing, and there are 14 sites, not 12

Implement's "Notes for Code Review" says _"The 12 existing `vi.unmock('zod')` calls are now harmless no-ops; left in place"_. Two problems: the user decided these **should** be removed in this PR, so leaving them is an unactioned scope item; and the count is **14**. Exact list, verified each is a bare `vi.unmock('zod');` and now a no-op:

```
src/__tests__/api/admin-edit-provider-halal-gate.test.ts:4
src/__tests__/api/admin-edit-provider.test.ts:4
src/__tests__/api/admin-review-provider-halal-gate.test.ts:4
src/__tests__/features/providers/provider-profile-completed-tracking.test.tsx:23
src/__tests__/lib/validations/adminSchemas-cs.test.ts:13
src/__tests__/lib/validations/adminSchemas.test.ts:9
src/__tests__/regression/255-boundary-roundtrip.test.tsx:36
src/__tests__/regression/255-submission-success.test.tsx:19
src/__tests__/regression/255-submission-validation.test.tsx:35
src/__tests__/regression/255-trust-boundaries.test.tsx:30
src/__tests__/regression/plan264-provider-recommend-auth.test.ts:65
src/__tests__/services/community-service-schemas.test.ts:14
src/app/api/city-interest/subscribe/route.test.ts:20
src/app/api/providers/route.test.ts:155
```

Fix: delete those 14 lines, plus any now-orphaned `vi` import in files where `vi` is used for nothing else (check each; most also call `vi.mock`, so the import usually stays). Re-run the suite; expect no change, since the global mock they defended against is gone from `src/__tests__/setup.ts`.

## Minor

### m1 (Standards) — Prettier reformatting dominates the diff; cause identified, recommend keeping and disclosing

Roughly 75% of the line churn in the five route files is pure formatting (trailing commas, collapsed `NextResponse.json(...)` calls, destructuring rewraps, trailing-whitespace strips), unrelated to zod. Examples: `badges/unverify/route.ts:21-23` destructuring rewrap, `subscribe-city/route.ts` ~30 trailing-comma-only hunks.

This is **not** author scope creep. `package.json` `lint-staged` runs `["eslint --fix", "prettier --write"]` on every staged `*.ts`, and main is already Prettier-dirty: `npx prettier --check` on `main:src/app/api/waitlist/update/route.ts` reports a style violation. The hook reformatted the files the migration had to touch.

Recommendation: **keep it.** Reverting fights the pre-commit hook and the churn returns on the next commit to those files. Instead add one line to the PR body noting the formatting hunks are lint-staged output on pre-existing drift, so reviewers can read the diff with `-w`. Not worth a separate commit split at this size.

### m2 (Spec) — `city-interest/subscribe` message change ships with no test

Decision 2 accepted the message text change at both `providers` and `city-interest`. `providers` got four new tests pinning the new v4 text (`providers-validation.test.ts:46-63`). `city-interest/subscribe/route.ts:32` also changes (`Required` -> `Invalid input: expected string, received undefined`) and gets nothing. The Grill acceptance criteria only demanded `providers`, so this is a gap against intent rather than a breach of the letter.

Fix: one test in the existing `src/app/api/city-interest/subscribe/route.test.ts` asserting the 400 body for a missing `cityName`. Cheap, and it pins the second of the two routes whose public text moved.

### m3 (Standards) — Module name and its test name disagree

The helper lives at `src/lib/validations/errors.ts` but its test is `src/__tests__/lib/validations/validationDetails.test.ts`. Grill specified `validationDetails.ts` exporting a named `ValidationDetail` type; Implement shipped `errors.ts` with the shape inlined as a return annotation (`errors.ts:9`). Both the filename drift and the dropped type are small, but `errors.ts` is a broad name for a module holding exactly one mapper, and callers now have no name for the shape they receive.

Fix: rename the module to `validationDetails.ts` to match its test and its single responsibility, and export `export type ValidationDetail = { path: string; message: string };`, returning `ValidationDetail[]`. Three import sites to update. Alternatively rename the test file to `errors.test.ts` if you prefer the broader module as a future home for more error mappers; just make the two agree.

## Nit

### n1 (Standards) — `path.join('.')` throws on a symbol path segment

`src/lib/validations/errors.ts:10`: `path: issue.path.join('.')`. v4 types `issue.path` as `PropertyKey[]`, and `Array.prototype.join` throws `TypeError: Cannot convert a Symbol value to a string` on a symbol element (verified). Unreachable today, since no schema here uses symbol keys, but this function is explicitly the stable seam that is supposed to absorb zod's churn, so it should not have a throw path. Fix: `issue.path.map(String).join('.')`.

### n2 (Standards) — The same invalid UUID fixture survives in three other files

Decision was to fix the fixtures; the fix landed only where tests were failing. The identical non-RFC-4122 string `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee` is still at:

```
src/__tests__/api/admin/edit-community-service.test.ts:66
src/__tests__/api/admin/community-services-get.test.ts:35
src/__tests__/services/community-service-edit.test.ts:36
```

Harmless now (the suite is green; those paths mock the service layer and never reach `.uuid()`), so this is not a correctness issue. But it leaves the codebase with the same literal meaning "valid id" in one place and "invalid id" in another. Fix: swap all three to `aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee`, or leave and let #531 sweep them; either is fine, just do it knowingly.

## Item-by-item on the brief's "check hard" list

| #   | Item                       | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Envelope at 3 helper sites | **Pass.** Byte-identical status/keys/siblings under `diff -w`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2   | UUID fixtures              | **Pass.** Two distinct literals changed (`community-service-schemas.test.ts:22`, `:62`); the "6" was 6 failing _tests_ sharing them. `aaaaaaaa-bbbb-4ccc-8ddd-...` and `bbbbbbbb-cccc-4ddd-8eee-...` are valid RFC 4122 (version nibble 4, variant 8). All other edits in that file are trailing commas. No assertion weakened, no test re-aimed; `rejects invalid UUID` still feeds `'not-a-uuid'`.                                                                                                                                                                                                    |
| 3   | 2 log-only sites           | **Pass.** `waitlist/join/route.ts:55` and `subscribe-city/route.ts:63-64` changed `.errors`->`.issues` inside `console.log` / `firstError` only. join's body stays the hardcoded string; subscribe-city's body stays `{ data: null, error: { message } }`. Nothing client-facing moved.                                                                                                                                                                                                                                                                                                                 |
| 4   | The 10 new tests           | **Pass, they pin rather than restate.** All three 400 assertions use `toEqual` on the whole parsed body, which fails on any extra key, so a `code`/`origin`/`pattern` regression breaks them. `validationDetails.test.ts:34-38` asserts `Object.keys(detail).sort()` equals `['message','path']`, a direct leak guard. `.default(null)` coverage is meaningful: it reaches into `mockCreateProviderOrServiceServer.mock.calls[0][0].formData` and asserts `latitude`/`longitude` are `null` for both the omitted-key and explicit-`null` inputs, so it tests the parsed output, not the schema's shape. |
| 5   | `errorMap`->`error` x2     | **Pass.** `adminSchemas.ts:16-18` and `:163-165`, value lists unchanged. Probed the new form against 4.6.5: bad value, missing key and wrong type all yield `reviewStatus must be one of: approved, rejected, needs_revision`, matching v3's `errorMap` which also applied to every issue from the schema. No semantic drift.                                                                                                                                                                                                                                                                           |
| 6   | Dead `vi.unmock('zod')`    | **Finding M1.** 14 sites, not 12, and not yet removed. List above.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 7   | No weakened gates          | **Pass.** See Gates section.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 8   | Lockfile hygiene           | **Pass.** Exact `4.6.5`; the `dev`-flag churn reproduces on main without touching zod. Nested `zod@4.4.3` under `@serwist/*` is dev-only and pre-existing.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 9   | Scope creep                | Only the Prettier churn (m1), and it is hook-generated, not authored. Nothing else in the diff is unnecessary to the migration. The `docs/ai/LEARNINGS.md` entry is required by AGENTS.md.                                                                                                                                                                                                                                                                                                                                                                                                              |

## Verdict

**Ship after fixes: M1 only.**

M1 is the single item the user explicitly asked for and did not get; it is mechanical (delete 14 lines, re-run the suite) and carries no behavioral risk. m1 needs a sentence in the PR body, not a code change. m2, m3, n1 and n2 are genuine improvements but none of them blocks a dependency bump that type-checks, lints at an unchanged cap and passes 2725 tests; fold them in if the follow-up handoff is cheap, otherwise attach m2/n2 to #531.

The core of this change is right, and the part the brief called highest-risk is the part that holds up best: the public 400 envelope is preserved exactly on all three routes, zod internals are provably off the wire, and the seam is in the right place.
