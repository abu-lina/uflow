---
ID: 283
Origin: 283
UUID: 10224E88-64CC-49EF-BD70-EE87A3A88AD5
Status: Active
Type: bug
Branch: fix/283-api-docs-jsyaml
Worktree: ../uflow-wt/283-api-docs-jsyaml
Created: 2026-10-02T22:05:22Z
---

# Request 283: /api-docs is broken in production, /api/swagger.json returns 500

## Original request

Surfaced as follow-up 1 from request 282 (Serwist migration), then CONFIRMED
broken in production during the live verification of that deploy.

## Classification

- **Type:** bug (production, user-facing)
- **Route:** Bug flow (Diagnose -> gate -> Fix -> Code Review -> Done)
- **Confidence:** high that it is broken; the open question is whether the
  2026-10-02 deploy caused it or inherited it.

## Confirmed symptom (production, 2026-10-02)

`GET https://ummahflow.com/api/swagger.json` returns **500**:

```json
{"error":"Failed to generate API documentation",
 "details":"Cannot set properties of undefined (setting 'keepCstNodes')"}
```

Confirmed by plain `curl`, with no service worker involved, so this is not
related to the Serwist migration's runtime caching.

`/api-docs` itself returns 200 (the page shell renders its loading spinner), then
fails client-side with 6 uncaught errors once the fetch resolves to a 500:
`Cannot read properties of undefined (reading 'load')` and
`Transformer error: ... (reading 'indexOf')`.

`/api-docs` is publicly reachable with no authentication.

## Mechanism (hypothesis, high confidence, needs confirming)

The error is a property write against `undefined`: something does
`YAML.defaultOptions.keepCstNodes = ...` where `YAML` is `undefined`.

That matches, exactly, the build warning this repo has been emitting all along:

```
Attempted import error: 'js-yaml' does not contain a default export (imported as 'YAML').
```

**js-yaml removed its ESM default export in 4.2.0.** Verified directly:
`js-yaml@4.1.0`'s `dist/js-yaml.mjs` contains `export default`; `4.3.2` does not.
So `import YAML from 'js-yaml'` yields `undefined` under strict ESM, and the first
property write on it throws. `keepCstNodes` is itself a legacy (pre-v4) option,
which is consistent with a consumer written against the v3 API.

This is the SAME root cause as the Turbopack build blocker recorded in request
282, just manifesting at runtime on the server rather than as a hard build error.
webpack downgrades it to a warning and emits `undefined`; Turbopack refuses to
build at all.

## THE FIRST QUESTION: did the 2026-10-02 deploy cause this?

Production was previously deployed from `26b27db0`. The deploy on 2026-10-02
shipped three commits, one of which (#488, dependabot) bumped
`next-swagger-doc` `^0.4.1 -> ^0.5.0`. That bump also moves the transitive
`swagger-jsdoc`:

| next-swagger-doc | swagger-jsdoc |
| --- | --- |
| 0.4.1 (previous prod) | 6.2.8 |
| 0.5.0 (current prod)  | 6.3.0 |

The repo also carries a floating override `"js-yaml": ">=4.3.0"`
(`package.json:169`), which is pre-existing and forces a js-yaml with no default
export regardless.

**This must be settled before anything else**, because it decides whether this is
a regression this session introduced (and a candidate for revert) or a
long-standing bug that was merely never noticed. The build warnings predate the
282 work, which points to "inherited", but that is an inference, not a
measurement. The decisive test is an A/B against `26b27db0`.

## Open questions for the Diagnose phase

1. Does `/api/swagger.json` 500 on `26b27db0` (previous prod) as well? Build that
   commit and hit the route. This is the regression A/B and the first thing to do.
2. Which package actually performs the failing `import YAML from 'js-yaml'` and
   the `keepCstNodes` write? Find the exact file in `node_modules` and the call
   path from `src/app/api/swagger.json/route.ts` (or wherever the route lives).
3. Is the floating `"js-yaml": ">=4.3.0"` override implicated? What does the tree
   resolve to, and what would `swagger-jsdoc` get without the override?
4. Has `/api-docs` ever worked in this repo? Check `git log` for when the override
   and the swagger deps were introduced relative to each other.
5. How exposed is this? `/api-docs` is public and unauthenticated. The 500 leaks
   an internal error string (`details`), which is a minor information-disclosure
   issue in its own right per the org guardrail about not exposing internal
   details in API responses.

## Fix options to evaluate (do not pick before the diagnosis)

Known dead ends from request 282's research, do not re-derive:
- Pinning js-yaml to 4.1.0 restores the default export but reintroduces
  GHSA-mh29-5h37-fv8m plus 4 more advisories covering 4.0.0-4.3.1.
- `turbopack.resolveAlias` to the CJS entry had no effect: the importers are
  inside `node_modules` and `dist/js-yaml.cjs.js` is not an exported subpath.
- `swagger-ui-react@5.33.1` is latest and still pins `swagger-client@3.38.2`.

Candidates worth weighing: upgrade or replace `next-swagger-doc`/`swagger-jsdoc`;
generate the OpenAPI spec at build time into a static JSON file instead of at
request time; drop the runtime spec generation entirely; or remove `/api-docs` if
nobody uses it. Note that fixing this is also what unblocks removing `--webpack`
from 6 build scripts (request 282 follow-up 2).

## Phases

| #   | Phase                 | Status  | Outcome   |
| --- | --------------------- | ------- | --------- |
| 0   | Tracking file created | Done    | This file |
| 1   | Diagnose (start with the regression A/B) | Done | Not a regression. Broken since 2026-03-28 (`f37af618`, `"yaml": ">=2.8.3"` override). Two independent bugs, 4 ranked options |
| 2   | Gate: confirm cause + pick a fix | Pending | Awaiting option choice (1-4) |
| 3   | Fix                   | Pending |           |
| 4   | Code Review           | Pending |           |
| 5   | Done                  | Pending |           |

## Decisions

| #   | Decision | Choice | Rationale |
| --- | -------- | ------ | --------- |
| 1   | Settle the regression question before designing a fix | A/B against 26b27db0 first | Decides revert vs forward-fix, and prod is currently broken either way |

## Diagnosis

Completed 2026-10-02. Every claim below is tagged **VERIFIED** (with the command
and output that produced it) or **INFERRED**. A "could not determine" section is
at the end. Node v22.23.3 everywhere, same machine, same method.

### Headline: NOT a regression from today's deploy

**VERIFIED.** `26b27db0` (previous production, `next-swagger-doc@0.4.1` /
`swagger-jsdoc@6.2.8`) fails with the identical error. Clean A/B, separate
worktree, same Node:

```
# /tmp/uflow-26b27db0 (26b27db0, npm ci)
RED: Cannot set properties of undefined (setting 'keepCstNodes')
npm ls yaml -> next-swagger-doc@0.4.1 > swagger-jsdoc@6.2.8 > yaml@2.9.0 deduped

# worktree 283 (b66181cb, npm ci)
RED: Cannot set properties of undefined (setting 'keepCstNodes')
npm ls yaml -> next-swagger-doc@0.5.0 > swagger-jsdoc@6.3.0 > yaml@2.9.0 deduped
```

Dependabot #488 is **not implicated**. `swagger-jsdoc` 6.2.8 and 6.3.0 both
carry the identical failing line and both declare the identical `yaml` pin
(`"yaml": "2.0.0-1"`, VERIFIED via `npm view swagger-jsdoc@6.2.8 dependencies`).
**Reverting #488 would not fix anything.**

### Q2: the exact failing code path, and the mechanism hypothesis is REFUTED

The hypothesis in this file blamed `js-yaml`. The server-side 500 has nothing to
do with js-yaml. **VERIFIED**, the owner of the failing line is the separate
eemeli `yaml` package:

```
node_modules/swagger-jsdoc/src/specification.js:3    const YAML = require('yaml');
node_modules/swagger-jsdoc/src/specification.js:187  YAML.defaultOptions.keepCstNodes = true;
```

Call path: `GET /api/swagger.json` -> `next.config.js:378` rewrite ->
`src/app/api/swagger/route.ts:11` `await import('next-swagger-doc')` ->
`route.ts:13` `createSwaggerSpec(...)` -> `swagger-jsdoc` `build()` ->
`specification.js:187`. The `catch` at `route.ts:54` turns it into the 500 body
seen in production.

Why it throws (**VERIFIED**): `yaml@2.9.0` has no `defaultOptions` export.

```
$ node -p "require('yaml').defaultOptions"
undefined
```

`defaultOptions` existed in `yaml@1.x` and in the 2022 prerelease `2.0.0-1`, and
in **no stable 2.x**. Probed 13 versions, one install each:

```
yaml@1.10.2 -> HAS defaultOptions keepCstNodes=true
yaml@2.0.0, 2.1.3, 2.2.2, 2.3.4, 2.4.5, 2.5.1, 2.6.1, 2.7.1, 2.8.0, 2.8.2, 2.8.3, 2.9.1 -> NO defaultOptions
```

So `swagger-jsdoc` 6.x/7.x only works against `yaml@2.0.0-*`. Clean install with
no overrides resolves exactly that and the spec generates:

```
# /tmp/noverride283: npm i next-swagger-doc@0.5.0 (no overrides)
npm ls yaml -> swagger-jsdoc@6.3.0 > yaml@2.0.0-1
GREEN: spec generated
```

### Q3: yes, the override is the real cause, but it is the `yaml` one, not `js-yaml`

**VERIFIED.** `package.json:181` `"yaml": ">=2.8.3"` hoists `yaml@2.9.0` over
`swagger-jsdoc`'s pinned `2.0.0-1` and is the direct cause of the 500.
`"js-yaml": ">=4.3.0"` (`package.json:169`) is **not** implicated in the 500.

Bisected to one commit, with real installs at both sides of the boundary:

```
f37af618^ (2026-03-27) npm ci -> GREEN: spec generated, paths= 3
f37af618  (2026-03-28) npm ci -> RED: Cannot set properties of undefined (setting 'keepCstNodes')
```

`f37af618` "Session/066 find bugs (#99)" is the commit that added
`+ "yaml": ">=2.8.3"` to `overrides`. Lockfile corroboration:

```
f37af618^: node_modules/swagger-jsdoc/node_modules/yaml 2.0.0-1 ; node_modules/yaml 2.8.2
f37af618 : (nested copy gone)                                   ; node_modules/yaml 2.8.3
```

Scoping the override to leave `swagger-jsdoc` alone fixes the 500 (**VERIFIED**,
experiment reverted afterwards):

```jsonc
"overrides": { "yaml": ">=2.8.3", "swagger-jsdoc": { "yaml": "2.0.0-1" } }
```
```
npm ls yaml -> swagger-jsdoc@6.3.0 overridden > yaml@2.0.0-1 overridden
curl localhost/api/swagger.json -> 200, paths: ['/api/push/subscribe','/api/push/send','/api/health']
```

### There is a SECOND, independent bug: `/api-docs` still does not render

This is the important thing the hypothesis half-saw. With the 500 fixed and a
valid spec being served, `/api-docs` is **still broken**. **VERIFIED** by a
headless Chromium check (Playwright, already in the repo) against the dev server:

```
status= 200  swagger-ui nodes= 1
body: "... Parser error / Unable to render this definition /
       The provided definition does not specify a valid version field ..."
errors(12):
  - TypeError: Cannot read properties of undefined (reading 'load')
      at node_modules/swagger-ui-react/swagger-ui-es-bundle-core.js
  - Transformer error: TypeError: Cannot read properties of undefined (reading 'indexOf')
```

*This* one is the js-yaml default-export bug, and it is real:

```
node_modules/swagger-ui-react/swagger-ui-es-bundle-core.js:
  import{JSON_SCHEMA as P,default as M}from"js-yaml";   # M === undefined -> M.load(...) throws
node_modules/js-yaml/dist/js-yaml.mjs (5.4.2):          # grep -c "export default" -> 0
```

The named import (`JSON_SCHEMA`) resolves; only `default` is `undefined`. Note
`swagger-ui-react@5.33.0` pins `"js-yaml": "=4.3.2"`, which has no default
export either, so **this bug exists with or without the `js-yaml` override**: it
is upstream's own broken import. The override only changes which broken version
you get (5.4.2 instead of 4.3.2).

Both bugs fixed at once, **VERIFIED** end to end:

```
# overrides: swagger-jsdoc>yaml 2.0.0-1  +  js-yaml 4.1.1 (has "jsYaml as default" in its .mjs)
status= 200  swagger-ui nodes= 1
body: "... UFLOW API Documentation  1.0.0  OAS 3.0 ... Servers ..."
errors(0):
```

### A shim fixes bug 2 without downgrading js-yaml, and it clears the Turbopack blocker

**VERIFIED.** Keeping `js-yaml@5.4.2` and aliasing the bare specifier to a
three-line CJS shim (`module.exports = { ...require('js-yaml-real'), default: m }`,
with `js-yaml-real` aliased to the absolute path of
`node_modules/js-yaml/dist/js-yaml.cjs.js`, which sidesteps the exports-map dead
end from request 282 because webpack/Turbopack get a file path, not a subpath):

| run | result |
| --- | --- |
| `next dev --webpack` + Playwright | `/api-docs` renders, **errors(0)** |
| `next dev` (Turbopack) + Playwright | `/api-docs` renders, **errors(0)** |
| `next build` (Turbopack) | **✓ Compiled successfully in 6.4s**, 121/121 pages |
| `next build` (Turbopack), shim removed | **✗ Build error: 5× "Export default doesn't exist in target module"**, all in `swagger-client` / `swagger-ui-react` js-yaml imports |
| `next build --webpack` | ✓ Compiled successfully, and the long-standing `Attempted import error: 'js-yaml' does not contain a default export` warning is **gone** |
| `next start` (webpack prod build) | `/api/swagger.json` -> **200**; `/api-docs` renders, errors(0) |

So the Turbopack blocker recorded in request 282 is the js-yaml bug, it is
fixable without a downgrade, and the fix is verified against a real Turbopack
production build.

### Why a js-yaml downgrade is the worst option (advisory facts, not `npm audit`)

From the GitHub advisory API directly:

- `GHSA-2883-xcg3-v3hh` / CVE-2026-84375, **high, 7.5**: js-yaml `>=4.0.0 <4.3.2`,
  first patched 4.3.2. Pinning 4.1.1 walks into this.
- `GHSA-5p4m-2wfm-xmqj`: quadratic `!!omap` resolution, affects **all** 3.x and
  4.x, "CVE-2026-59870 fix not backported", fixed only in the 5.x line (5.2.1).
  There is therefore **no advisory-clean js-yaml 4.x at all**.
- `GHSA-r3ph-w7gj-g6xm`: js-yaml `>=5.0.0 <=5.4.0`, patched 5.4.1. Current
  resolution 5.4.2 is clean.

### Q4: exposure

- **VERIFIED.** `/api/swagger.json` is completely unauthenticated: `src/middleware.ts:182`
  matches `'/((?!api|_next/static|_next/image|favicon.ico).*)'`, so no middleware
  runs for `/api/*` at all. The route handler itself has no auth check.
- **VERIFIED.** `/api-docs` is public: it passes through middleware, appears only
  in the `APP_ROUTES` waitlist gate (`src/lib/middleware-utils.ts:25`), and
  `curl` returns 200 with no session.
- **VERIFIED.** Blast radius is one page. The only consumer of the spec is
  `src/app/api-docs/page.tsx:27`. Nothing else in the repo fetches it (grep for
  `swagger.json` / `/api/swagger` hits only that page, the `next.config.js:378`
  rewrite, and docs prose).
- **Information disclosure, reported not fixed** (per instruction, and it is
  already in Follow-ups): `src/app/api/swagger/route.ts:59` returns
  `details: error.message` to the client, which is how the internal stack message
  ended up in the public 500 body. This violates the org guardrail "NEVER expose
  stack traces, internal paths, database schema, or framework details in API
  responses". Severity **Low** (one internal exception string, no PII, no creds).
- **VERIFIED.** The docs are nearly empty anyway: 3 of 59 route handlers carry
  `@swagger` annotations (`api/health`, `api/push/subscribe`, `api/push/send`),
  i.e. 5% coverage, which is what the working spec produced (`paths= 3`).

### Q5: it did work, and it has been broken for about six months

**VERIFIED** (lockfile resolution scanned across 54 commits that touched
`package-lock.json`, plus the real-install A/B above):

| when | commit | what changed | state of `/api-docs` |
| --- | --- | --- | --- |
| before 2026-03-28 | | `swagger-jsdoc/node_modules/yaml 2.0.0-1`, `js-yaml 4.1.1` | **worked** (server GREEN verified at `f37af618^`; client GREEN verified with js-yaml 4.1.1) |
| 2026-03-28 | `f37af618` | `+ "yaml": ">=2.8.3"` override | **server 500 starts** |
| 2026-06-18 | `fd7aa044` | js-yaml override `^4.1.1` -> `4.2.0` (Plan 189 dependabot) | **client render breaks too** |
| 2026-08-02 | `bc03559a` | js-yaml override -> `>=4.3.0` (now resolves 5.4.2) | same, still broken |
| 2026-10-02 | `b6337c31` (#488) | next-swagger-doc 0.4.1 -> 0.5.0 | **no change, already broken** |

Both breaks came from unbounded `>=` security overrides, not from feature work
and not from dependabot bumps. The two QA/UAT records that "verified `/api-docs`"
(`agent-output/qa/closed/037-...`, `agent-output/uat/closed/037-...`, 2026-03-08)
predate the `yaml` override and only asserted "compiles, returns 200 for the HTML
shell", which this bug still does today. Nobody ever asserted the spec fetch or
the rendered UI.

### Feedback loop (reusable)

Two commands, both seconds, both red-capable:

```js
// repro283.mjs, run from the repo root with `node repro283.mjs`
const { createSwaggerSpec } = await import('next-swagger-doc');
try { createSwaggerSpec({ definition: { openapi: '3.0.0', info: { title: 't', version: '1' } },
                          apiFolder: 'src/app/api' });
      console.log('GREEN'); }
catch (e) { console.log('RED:', e.message); process.exitCode = 1; }
```

and a Playwright page check that asserts `.swagger-ui` renders and the console
error count is 0 (bug 2 is invisible to any HTTP status check: the page is 200
either way). Both were deleted after the diagnosis; Phase 3 should re-create
them as the regression tests.

### Ranked fix options

**1. Scope the two overrides, add the js-yaml shim alias (recommended).**
Fully verified above, including a Turbopack production build and a webpack
production build + `next start`. Changes: `overrides` gets
`"swagger-jsdoc": { "yaml": "2.0.0-1" }`; a 3-line `jsyaml-shim.cjs`; a
`resolve.alias` entry in `next.config.js`'s `webpack()` and the same pair in
`turbopack.resolveAlias`. Keeps `js-yaml@5.4.2`, so no advisory regression.
Trade-offs: pins `swagger-jsdoc` to a 2022 `yaml` prerelease (server-side only,
parses our own JSDoc comments, not user input); the shim is a bundler-level
workaround for two unmaintained upstream packages and needs a comment saying so.
**Unblocks `--webpack` removal: YES, verified** (`next build` under Turbopack
succeeds with it, fails with 5 errors without it).
Regression test: both loop commands above. The Playwright one must assert
rendered `.swagger-ui` + zero console errors, not HTTP 200, or it will not catch
bug 2. Add a CI assertion that `npm ls yaml` keeps `swagger-jsdoc > yaml@2.0.0-1`.

**2. Generate the spec at build time into a static `public/swagger.json`, keep
the shim for the UI.** Removes `next-swagger-doc` from the server runtime
(no per-request `glob` over `src/app/api`, no 500 path, no `details` leak) and
makes the spec cacheable. Does **not** on its own fix anything: the build script
still runs `swagger-jsdoc`, so it still needs option 1's scoped `yaml` override,
and the UI still needs the shim. Strictly more work than option 1 for a real but
secondary win. **Unblocks `--webpack` removal: only via the shim it borrows from
option 1** (the Turbopack errors are all in the client chunk, which is
`swagger-ui-react`, not the spec generator).
Regression test: a build-time assertion that the generated JSON has
`openapi` + non-empty `paths`, plus the Playwright check.

**3. Delete `/api-docs`, `/api/swagger`, the rewrite, and the three deps.**
The honest option: the page has been broken for ~6 months with nobody noticing,
it documents 5% of the API, it is public and unauthenticated, and
`swagger-ui-react` drags in ~1.2MB plus the dompurify/immutable advisory surface
that two prior sessions spent time triaging. Removes both bugs and the leak by
deletion. Trade-off: loses a dev-facing tool, and `docs/architecture/ARCHITECTURE_OVERVIEW.md`
(lines 998, 1242, 1255) would need updating. **Unblocks `--webpack` removal: YES,
and most cleanly** (the 5 Turbopack errors all live in `swagger-client`, reached
only from this page; no shim needed afterwards).
Regression test: none needed, just assert the routes 404 and grep that no
`swagger` imports remain.

**4. Upgrade or replace `next-swagger-doc` / `swagger-jsdoc`. Dead end, do not
spend time here. VERIFIED:** `0.5.0` is the latest `next-swagger-doc`, and the
newest `swagger-jsdoc` of any kind, `7.0.0-rc.6`, still contains
`YAML.defaultOptions.keepCstNodes = true` (`src/specification.js:200`) and still
pins `"yaml": "2.0.0-1"`. There is no upstream version where this is fixed.
Mentioned only so it is not re-litigated.

**Revert #488 is not on the list:** Q1 says it is not a regression, and 6.2.8 is
byte-for-byte equivalent for this bug.

### Could not determine

- Whether `/api-docs` ever worked **in production**. The "it worked before
  2026-03-28" claim is a local measurement at `f37af618^` plus lockfile
  resolution, not a production observation. No archived prod response exists.
- Whether Swagger UI's deeper features ("Try it out", remote `$ref` resolution)
  behave correctly against `js-yaml@5.4.2` through the shim. Verified: page
  renders, spec loads, zero console errors. Not verified: anything that exercises
  `swagger-client`'s YAML parsers on real YAML input. js-yaml 5 kept
  `load`/`dump`/`JSON_SCHEMA`, so this is probably fine, but it is INFERRED.
- Whether `yaml@2.0.0-1` carries any advisory of its own. It is a 2022
  prerelease; no GHSA was checked for it. Worth one lookup before shipping
  option 1 or 2.
- Why `f37af618` added `"yaml": ">=2.8.3"` at all. The commit is a broad
  security-remediation commit; the specific advisory it was answering was not
  traced, so "can we drop the override entirely instead of scoping it" is open.
- The first page load in dev reproducibly throws one `Invalid or unexpected
  token` page error before the chunk finishes compiling; it disappears on the
  second load. Looks like a dev-compile artifact, unrelated, not investigated.

## Follow-up requests

_New work discovered during this request._

- The 500 response body includes `details` with an internal error message.
  Internal error details should not be returned to clients.
- `"js-yaml": ">=4.3.0"` is one of ten unbounded `>=` overrides
  (request 282 follow-up 7). The diagnosis makes this concrete: **two** of those
  unbounded overrides each broke a different half of `/api-docs`
  (`yaml >=2.8.3` on 2026-03-28, `js-yaml` widening on 2026-06-18), and npm
  silently dropped a nested pinned copy to satisfy the first one. Any policy work
  here should require that an override which overrides a *pinned exact* transitive
  dep (`"yaml": "2.0.0-1"`) be scoped to the dependent rather than applied globally.
- QA/UAT asserting "page returns 200" is not evidence a page works.
  `/api-docs` has returned 200 throughout six months of being completely broken,
  and the closed 037 QA/UAT records cite exactly that signal. Page-level checks
  for client-rendered pages need a console-error assertion.

## Learnings

_Captured after review and test (workflow.mdc rule)._
