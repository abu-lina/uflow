---
ID: 277
Origin: 276
UUID: 1B8F3D52-4C06-47A9-B5E1-7A2D9C40E6F3
Status: In Progress
Type: change-request
Branch: feature/277-next-16-upgrade
Worktree: ../uflow-wt/277-next-16
Created: 2026-10-01T00:00:00Z
---

# Request 277: Next.js 15 -> 16 with an explicit webpack opt-out

## Original request

Follow-on from request 276 (Playwright smoke suite). Asked what to do next;
recommended Next 16 because the new smoke suite now covers its main risk
(rendering, middleware, the SSR auth round-trip). Approved.

Resolves Dependabot PRs **#466** (`next`) and **#463** (`eslint-config-next`),
which version in lockstep.

## Target

`next` and `eslint-config-next` to **16.3.8**, both pinned exact.

### This was 16.3.6 first, and that was wrong

The original target was 16.3.6, chosen because it had been public 9 days while
16.3.7 and 16.3.8 were 2 and 1 days old, and policy here prefers a release that
has been out at least 7 days (a meaningful share of supply-chain attacks are
caught and yanked within days). 16.3.6 was also Dependabot's proposal.

Snyk failed the PR and was right. **`next@16.3.6` carries a high-severity SSRF**:
CVE-2026-94483, SNYK-JS-NEXT-20366781, CWE-918, CVSS 8.3, fixed in **16.3.8**
(so 16.3.7 is affected too). The rapid 16.3.7 and 16.3.8 releases, one day apart
after a 7-day gap, were the security releases.

Resolution: a published CVSS 8.3 SSRF is a **confirmed** risk; the 7-day rule
mitigates a **hypothetical** one. Known beats hypothetical, so take 16.3.8.

### Why every other signal said "clean"

Worth recording, because the reassurance was false:

| Source                                    | Said                                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------- |
| `npm audit` (all levels)                  | 0 vulnerabilities                                                                     |
| GitHub advisory DB, `next@16.3.6`         | clean; 16.3.6 is itself the patch for `GHSA-vcvr-r3jv-pc5j`, a critical `next/og` RCE |
| GitHub advisory DB, 7 new transitive deps | no advisories                                                                         |
| Snyk                                      | **high-severity SSRF**                                                                |

GHSA does not carry CVE-2026-94483 yet, and `npm audit` reads GHSA. So the
"0 vulnerabilities" result was not evidence of safety, it was evidence that one
database had not caught up. Two independent scanners disagreed and the one with
the finding was correct.

## Ground truth established before briefing

### Next 16 is not blocked here

| Check                              | Result                                                           |
| ---------------------------------- | ---------------------------------------------------------------- |
| `next-intl@4.4.0` peer             | lists `^16.0.0` explicitly                                       |
| `@ducanh2912/next-pwa@10.2.9` peer | `next: >=14.0.0`                                                 |
| `next-swagger-doc@0.4.1` peer      | `next: >=9`                                                      |
| Node                               | Next 16 needs `>=20.9.0`; repo declares `>=22.12.0`              |
| React 19                           | **not** gated; `next@16`'s react peer range is unchanged from 15 |
| `next lint` removal                | non-issue; repo already runs `eslint .` with `eslint.config.mjs` |
| `@next/bundle-analyzer`            | already declared at `^16.0.0`                                    |

### The one real risk: Turbopack becomes the default bundler

Next 16 makes Turbopack the default for `next dev` and `next build`. Per Next's
docs, "Turbopack replaces webpack, so `webpack()` configs are not recognized."

This repo depends on webpack in exactly one way that matters:

- `next.config.js:296` defines `webpack: (config, { isServer }) => {...}`, but it
  only sets `watchOptions.ignored`. The old custom `splitChunks` was already
  removed (its comment records that it inflated First Load JS from ~350kB to
  687kB). So this block is close to vestigial.
- `next.config.js:1` wraps everything in `withPWA` from
  `@ducanh2912/next-pwa`, which generates the service worker **through webpack**.
  That is load-bearing: `importScripts: ['/sw-push-handler.js']` drives push
  notifications, there is an `/offline.html` fallback, and `runtimeCaching` is
  hand-tuned with a documented incident behind it (see
  `agent-output/analysis/closed/046-iconify-pwa-analysis.md`).

Under Turbopack the service worker silently stops being generated. No build
error, no failing test, and push plus offline break in production.

## Decision: opt out with `--webpack`

`--webpack` is an officially documented flag, not a workaround. Chosen because:

1. Nothing of value is lost. The custom `webpack()` block only tunes file watching.
2. The PWA is load-bearing and its plugin is webpack-only.
3. The migration target is not ready. `@serwist/next` is the successor to
   `@ducanh2912/next-pwa` (same author), but its Turbopack support sits in a
   separate `@serwist/turbopack` package on the **v10 preview** track, and
   serwist issue #301 ("Support next.js 16") is still open.
4. It separates "get onto Next 16" from "replace the PWA toolchain". Taking a
   framework major, a PWA migration and a bundler switch together stacks three
   migrations into one reviewable unit.

## Known follow-up, deliberately out of scope

`@ducanh2912/next-pwa` was last published **2024-09-18**, over two years stale
and abandoned in favour of Serwist. That, not Next 16, is what pins this repo to
webpack. Sequencing: this request, then a Serwist migration, then drop
`--webpack`.

## Open risk

`@ducanh2912/next-pwa@10.2.9` predates Next 16 by two years. Its peer range
allows it, but a stale plugin that hooks the webpack pipeline may still break
against Next 16 internals even under `--webpack`. If it does, that forces the
Serwist migration earlier than planned; stop and escalate rather than improvise.

## Scope

- Bump `next` and `eslint-config-next` to 16.3.6.
- Add `--webpack` to the `dev` and `build` scripts.
- Add a service-worker registration assertion to the smoke suite, closing the
  one blind spot that matters for this change.
- Verify the generated service worker still contains the push handler import.

## Status

- [x] Investigate peer deps, bundler default, PWA coupling, Serwist readiness
- [x] Branch + tracking
- [ ] Bump, add `--webpack`, verify build and PWA output
- [ ] Service-worker assertion in the smoke suite
- [ ] PR, CI, merge; close #466 and #463
- [ ] Capture learning
