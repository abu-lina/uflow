---
ID: 5
Origin: 5
UUID: d7e2a91f
Status: Planned
---

# 005 — UAT Docker Build Failure: npm ci --no-audit

## Changelog

| Date | Change |
|------|--------|
| 2026-02-21 | Initial analysis — root cause verified |
| 2026-02-21 | Status → Planned; handed off to planning | Plan 005 created in agent-output/planning |

---

## Value Statement and Business Objective

The UAT deployment pipeline is the sole deployment path to https://uat.ummahflow.com. A broken pipeline blocks all feature validation, QA testing, and stakeholder previews. Restoring it directly unblocks the v0.2.0 release.

---

## Objective

Determine the root cause of the `npm ci --no-audit` failure during Docker buildx in the "Build & Deploy to UAT" GitHub Actions workflow.

---

## Context

- **Error**: `buildx failed with: ERROR: failed to build: failed to solve: process "/bin/sh -c npm ci --no-audit" did not complete successfully: exit code: 1`
- **Workflow**: `.github/workflows/deploy-uat.yml` — triggered on push to `main`
- **Dockerfile**: `node:20-alpine` base image → `npm ci --no-audit`
- **Trigger**: The `Release v0.2.0` commit (`8ba4b72`) pushed to `main`

---

## Methodology

1. Read Dockerfile, package.json, package-lock.json, and deploy-uat.yml
2. Compared dependency specifications between package.json and package-lock.json
3. Reproduced `npm ci --no-audit` locally (fails identically)
4. Inspected npm debug logs for stack trace
5. Searched npm/cli GitHub issues for the exact error message
6. Traced git history to identify the triggering commit

---

## Findings

### Finding 1 — VERIFIED: package.json and package-lock.json are severely out of sync

`npm ci` requires the lock file to exactly match `package.json`. The following mismatches were found:

| Package | package.json | package-lock.json | Issue |
|---------|-------------|-------------------|-------|
| `@ducanh2912/next-pwa` | `^10.2.9` | *(missing entirely)* | Added to package.json but lock file never regenerated |
| `prettier-plugin-tailwindcss` | `^0.7.2` | *(missing entirely)* | Added to package.json but lock file never regenerated |
| `@supabase/ssr` | `^0.6.1` | `^0.8.0` | Downgraded in package.json, lock file not updated |
| `@tanstack/react-query` | `^5.90.2` | `^5.90.12` | Downgraded in package.json, lock file not updated |
| `@tanstack/react-query-devtools` | `^5.90.2` | `^5.90.12` | Downgraded in package.json, lock file not updated |
| `lucide-react` | `^0.545.0` | `^0.562.0` | Downgraded in package.json, lock file not updated |
| `next-intl` | `^4.4.0` | `^4.5.8` | Downgraded in package.json, lock file not updated |
| `sonner` | `^2.0.3` | `^2.0.7` | Downgraded in package.json, lock file not updated |
| `prettier` | `^3.8.1` | `^3.5.3` | Upgraded in package.json, lock file not updated |
| Root version | `0.2.0` | `0.1.0` | Version bumped in package.json but lock file not regenerated |

**9 dependency spec mismatches + 2 missing packages = `npm ci` guaranteed failure.**

`npm ci` behavior: it compares the `packages[""].dependencies` and `packages[""].devDependencies` entries in the lock file against `package.json`. Any spec mismatch causes it to abort (unlike `npm install`, which would update the lock file).

### Finding 2 — VERIFIED: npm 11.6.3 override bug (local environment)

The local environment (Node v23.7.0, npm 11.6.3) hits an **additional** bug:

- **Error**: `Cannot read properties of undefined (reading 'ruleset')`
- **Location**: `@npmcli/arborist/lib/override-set.js:220`
- **Cause**: npm 11.6.3 introduced a regression in override conflict detection (PR #8689). When `overrides` contains nested overrides (e.g., `next → react/react-dom`) alongside top-level overrides (e.g., `bn.js`, `js-yaml`), the arborist crashes.
- **npm issue**: [npm/cli#8757](https://github.com/npm/cli/issues/8757) — confirmed bug, fixed in PR [#8760](https://github.com/npm/cli/pull/8760)
- **Affects**: npm 11.6.3 specifically. npm 10.x (Docker) and npm 11.6.2 are unaffected.

The `bn.js` override was added in the `Release v0.2.0` commit (`8ba4b72`).

### Finding 3 — VERIFIED: Overrides not reflected in lock file

The `overrides` section in package.json:
```json
{
  "next": { "react": "^18.3.1", "react-dom": "^18.3.1" },
  "js-yaml": "^4.1.1",
  "bn.js": ">=5.2.3"
}
```

The lock file has **zero** override entries — `overrides` key is absent from the lock file root. The lock file was never regenerated after overrides were modified.

---

## Root Cause (Verified)

**Primary**: The `package-lock.json` is stale. It was not regenerated after multiple dependency spec changes in `package.json` (accumulated across several commits leading to the v0.2.0 release). `npm ci` detects the mismatch and exits with code 1.

**Contributing factor (local only)**: npm 11.6.3 has a separate bug with override conflict detection that also prevents `npm ci` from working, even if the lock file were in sync. This affects the local development environment but is a distinct issue from the CI/Docker failure.

**How it happened**: The `package.json` was edited directly (dependency specs changed) without running `npm install` to regenerate the lock file. The lock file reflects a prior state of `package.json` where:
- `@ducanh2912/next-pwa` and `prettier-plugin-tailwindcss` didn't exist
- Several packages had different version ranges
- The `bn.js` override didn't exist
- The root version was `0.1.0`

---

## System Weaknesses

### Architecture/Code

1. **No CI validation of lock file freshness** — The pipeline has no pre-build check that `package.json` and `package-lock.json` are in sync. A `npm ci --dry-run` or hash comparison step before Docker build would catch this earlier with a clear error message.

2. **No `.npmrc` engine strictness** — The `engines` field specifies `node >=18.0.0, npm >=9.0.0` but there's no `engine-strict=true` in `.npmrc`. This allows the lock file to be generated by any npm version without enforcement.

3. **Local-CI Node version gap** — Local: Node v23.7.0 / npm 11.6.3. Docker: node:20-alpine (Node 20.20.x / npm 10.8.x). This version gap means lock files generated locally may use features or behaviors not available in CI, and vice versa.

### Process

4. **No pre-commit hook for lock file sync** — `lint-staged` only runs ESLint and Prettier. There's no check that `package-lock.json` is consistent with `package.json` before committing.

5. **Manual package.json edits without npm install** — Multiple dependency specs were changed by directly editing `package.json` without running `npm install` to update the lock file. This is a recurring pattern across several commits.

---

## Instrumentation Gaps

### Normal (always-on)

- **Lock file hash check in CI** — Add a step before Docker build: `npm ci --dry-run` or compare `npm ls --json` output against expected state. This would produce a clear error like "package-lock.json out of date" instead of a cryptic Docker build failure.

### Debug (opt-in)

- **Verbose npm ci in Dockerfile** — Change `npm ci --no-audit` to `npm ci --no-audit --loglevel verbose` when debugging, to surface the exact dependency mismatch that causes failure. Currently the Docker build just shows exit code 1 with no detail.

---

## Analysis Recommendations (Next Steps)

1. **Regenerate package-lock.json** — Run `npm install` with a compatible Node/npm version (Node 20.x preferred, to match Docker) to bring the lock file into sync with the current `package.json`. Commit the updated lock file.

2. **Pin local Node version** — Add an `.nvmrc` file with `20` (or the exact version matching Docker) so developers use the same Node version as CI.

3. **Consider removing the bn.js override** — Verify whether the `bn.js >=5.2.3` override is necessary. It was added for a Dependabot security alert, but if `bn.js` is only a transitive dependency of `asn1.js` (which requires `^4.0.0`), forcing `>=5.2.3` could cause a breaking change. The Dependabot alert may have been for a different version of `bn.js` than the one actually used.

4. **Test npm ci after lock file regeneration** — Before pushing, verify `npm ci --no-audit` succeeds locally with Node 20.x.

---

## Open Questions

1. **Why was `@supabase/ssr` downgraded from `^0.8.0` to `^0.6.1`?** — Was this intentional or an accidental regression? The lock file suggests `^0.8.0` was previously used.

2. **Is the `bn.js >=5.2.3` override safe?** — `asn1.js` depends on `bn.js ^4.0.0` (a major version constraint). Forcing `>=5.2.3` crosses a major version boundary. This may cause runtime errors in cryptographic operations if `bn.js` v5 has breaking API changes from v4.

3. **Should the Dockerfile pin a specific Node version?** — Currently uses `node:20-alpine` (floating tag). Pinning to `node:20.20-alpine` would prevent unexpected npm version changes when the tag updates.
