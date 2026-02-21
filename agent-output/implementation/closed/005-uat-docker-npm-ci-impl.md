---
ID: 005
Origin: Orchestrator
UUID: 005-uat-docker-npm-ci
Status: Active
---

# Implementation: UAT Docker npm ci Fix

## Plan Reference

- **Plan**: [005-uat-docker-npm-ci-fix.md](../planning/005-uat-docker-npm-ci-fix.md)
- **Critique**: [005-uat-docker-npm-ci-fix-critique.md](../critiques/005-uat-docker-npm-ci-fix-critique.md)

## Date

2026-02-21

## Changelog

| Date       | Handoff     | Request            | Summary                              |
| ---------- | ----------- | ------------------ | ------------------------------------ |
| 2026-02-21 | Implementer | Plan 005 execution | Initial implementation of npm ci fix |

## Implementation Summary

Fixed the UAT Docker build failure (`npm ci --no-audit` exit code 1) by:

1. **Regenerating package-lock.json** — The old lockfile was severely out of sync with package.json (9 spec mismatches, phantom dependencies from removed packages)
2. **Removing problematic bn.js override** — The `"bn.js": ">=5.2.3"` override crossed a major version boundary and triggered npm 11.6.3 bug
3. **Adding .nvmrc** — Pinned Node version to 20 for contributor toolchain alignment
4. **Adding pre-Docker npm ci step** — Added workflow step for early failure detection with clear logs
5. **Fixing phantom dependencies** — Restored 4 dependencies that were removed from package.json but still referenced by source code

## Value Statement Validation

**Original**: "Restore UAT CI pipeline so that pushes to main build and deploy successfully."

**Implementation Delivers**:

- `npm ci --no-audit` now succeeds locally ✅
- `npm run build:standalone` now succeeds ✅
- Lockfile is synchronized with package.json ✅
- Pre-Docker validation step catches dependency issues early ✅

## Milestones Completed

- [x] Step 1: Lockfile Regeneration (primary fix)
- [x] Step 2: Toolchain Alignment (.nvmrc)
- [x] Step 3: CI/Docker Determinism (pre-Docker npm ci step)
- [x] Step 4: Overrides Hygiene (bn.js removal)
- [x] Additional: Restored phantom dependencies

## Files Modified

| Path                               | Changes                                                                             | Lines            |
| ---------------------------------- | ----------------------------------------------------------------------------------- | ---------------- |
| `package.json`                     | Added 4 missing dependencies, added 2 type packages, removed bn.js override         | +7/-1            |
| `package-lock.json`                | Full regeneration — version sync, all deps resolved                                 | ~2500 net change |
| `next.config.js`                   | Fixed PWA import: `require('next-pwa')` → `require('@ducanh2912/next-pwa').default` | +1/-1            |
| `.github/workflows/deploy-uat.yml` | Added pre-Docker `npm ci --no-audit` validation step                                | +8               |

## Files Created

| Path     | Purpose                                 |
| -------- | --------------------------------------- |
| `.nvmrc` | Pin Node version to 20 for contributors |

## Code Quality Validation

- [x] `npm ci --no-audit` succeeds (1148 packages installed)
- [x] `npm run build:standalone` succeeds (production build completes)
- [ ] Type-check: Pre-existing errors in test files (not introduced by this change)
- [ ] Lint: Pre-existing errors in test files (not introduced by this change)

## Detailed Changes

### 1. package.json Dependencies Restored

```diff
+ "next-swagger-doc": "^0.4.1",
+ "react-window": "^1.8.10",
+ "swagger-ui-react": "^5.30.2",
+ "@types/react-window": "^1.8.8",
+ "@types/swagger-ui-react": "^5.18.0",
```

These packages were previously removed from package.json but still referenced by:

- `src/app/api-docs/page.tsx` → swagger-ui-react
- `src/app/api/swagger/route.ts` → next-swagger-doc
- `src/components/providers/SearchResultsList.tsx` → react-window

### 2. bn.js Override Removed

```diff
  "overrides": {
    "next": { "react": "^18.3.1", "react-dom": "^18.3.1" },
-   "js-yaml": "^4.1.1",
-   "bn.js": ">=5.2.3"
+   "js-yaml": "^4.1.1"
  },
```

**Rationale**:

- No CVE found for bn.js 4.12.2 in project security docs
- Override crosses major version boundary (4.x → 5.x)
- `asn1.js` requires `bn.js ^4.0.0` — forcing 5.x violates semver
- Override triggered npm 11.6.3 bug (npm/cli#8757)

### 3. next.config.js PWA Import Fix

```diff
- const withPWA = require('next-pwa')({
+ const withPWA = require('@ducanh2912/next-pwa').default({
```

**Rationale**: Package.json specifies `@ducanh2912/next-pwa` (actively maintained fork), but config was importing `next-pwa` (unmaintained original). The old lockfile had both as phantom entries.

### 4. deploy-uat.yml Pre-Docker Validation

```yaml
- name: Validate npm ci (pre-Docker sanity check)
  uses: actions/setup-node@v4
  with:
    node-version-file: '.nvmrc'

- name: Run npm ci
  run: npm ci --no-audit
```

**Rationale**: Fails fast with clear npm output before buildx, making dependency issues easier to diagnose.

## Test Execution Results

| Command                    | Result                      | Notes                                         |
| -------------------------- | --------------------------- | --------------------------------------------- |
| `npm ci --no-audit`        | ✅ Pass                     | 1148 packages, 24s                            |
| `npm run build:standalone` | ✅ Pass                     | Production build succeeds                     |
| `npm test`                 | ⚠️ 4 suites fail (53 tests) | **Pre-existing** — verified identical on main |

### Pre-existing Test Failures (NOT introduced by this change)

Verified by running tests on unmodified main branch — same 4 failing suites:

- `ProviderCard.test.tsx`
- `SearchBar.test.tsx`
- `ProviderDetailModal.test.tsx`
- `verify-magic-link.test.ts`

## Outstanding Items

### Incomplete

- None

### Known Issues (Pre-existing)

- Type errors in `verify-magic-link.test.ts` — pre-existing
- Test failures in UI component tests — pre-existing

### Deferred

- Docker base image pinning (e.g., `node:20.20-alpine`) — plan said "consider", root cause was lockfile not npm version drift

### Test Failures

- 4 test suites failing (53 tests) — all pre-existing, verified against main branch

### Missing Coverage

- None — this is a build infrastructure fix, not feature code

## TDD Compliance

N/A — This implementation is a build/infrastructure fix (lockfile regeneration, dependency restoration, workflow modification). No new application code was written that would require TDD.

| Function/Class                        | Test File | Test Written First? | Failure Verified? | Failure Reason | Pass After Impl? |
| ------------------------------------- | --------- | ------------------- | ----------------- | -------------- | ---------------- |
| N/A (dependency/tooling changes only) | N/A       | N/A                 | N/A               | N/A            | N/A              |

## Next Steps

1. **Code Review** — Review changes to package.json, deploy-uat.yml, next.config.js
2. **QA** — Verify UAT deployment succeeds after merge
3. **DevOps** — Merge and monitor GitHub Actions pipeline

---

✅ PHASE COMPLETE: ⑤ Implementer
📄 Output: agent-output/implementation/005-uat-docker-npm-ci-impl.md
➡️ NEXT: Pick "⑥ Code Reviewer" from the Orchestrator handoff suggestions
Gate: Review verdict must be APPROVED or APPROVED_WITH_COMMENTS
