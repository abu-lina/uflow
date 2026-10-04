---
ID: 34
Origin: 34
UUID: 9f3a1e7c
Status: Committed
---

# QA Report: Provider Image Load Performance (Plan 034)

**Plan Reference**: `agent-output/planning/034-provider-image-load-performance-v0.6.12.md`
**QA Status**: QA Complete
**QA Specialist**: qa

## Changelog

| Date | Agent Handoff | Request | Summary |
| --- | --- | --- | --- |
| 2026-03-07 | Implementer → QA | Execute QA for Plan 034 | Created QA strategy; pending execution evidence |
| 2026-03-07 | QA | Run QA gates | Type-check, tests, build, perf budgets passed; delta lint warnings only |

## Timeline

- **Test Strategy Started**: 2026-03-07T16:45Z
- **Test Strategy Completed**: 2026-03-07T16:48Z
- **Implementation Received**: 2026-03-07T16:40Z
- **Testing Started**: 2026-03-07T16:48Z
- **Testing Completed**: 2026-03-07T16:53Z
- **Final Status**: QA Complete

## Test Strategy (Pre-Implementation)

### Scope

User-facing risk is concentrated in the provider detail hero image pipeline:

- `next/image` format policy (`next.config.js`)
- Hero `<Image fill>` attributes (`sizes`, `priority`) on provider detail surfaces
- Deployment config to persist `.next/cache/images` across container restarts/deployments

### Primary User Scenarios

1. Desktop provider detail view: hero image loads quickly on first visit after deploy (cold cache).
2. Desktop provider detail view: hero image loads near-instantly on repeat visit (warm cache).
3. Mobile provider detail view: first hero image is prioritized and uses correct `sizes` to avoid oversized requests.
4. Regression safety: changes do not break builds/tests; `next/image` mock and tests continue to represent expected DOM attributes.

### Testing Infrastructure Requirements

**Frameworks/Libraries** (expected already present in repo):

- Vitest
- React Testing Library
- ESLint
- Next.js build

**No new dependencies required.**

### Required Unit Tests

- Verify `ProviderDetailModal` hero image sets `sizes` to match fixed container (`640px`).
- Verify `ProviderDetailPage` hero image sets responsive `sizes` string.
- Verify `ProviderDetailPage` hero image sets `priority` for the first image (test via `next/image` mock marker).

### Required Integration / Build Tests

- `npm run type-check`
- `npx vitest run`
- `npm run build` (or equivalent in CI)

### Deployment/Infra Validation (non-local)

These cannot be fully proven from local/unit tests:

- Named volume mount for `/app/.next/cache/images` is present in the actual deployment path (GitHub Actions workflows for UAT/prod).
- Warm-cache behavior persists across deployment (requires UAT or environment with Docker + volume).

### Acceptance Criteria

- All automated gates pass (type-check, tests, build, perf budgets if enforced).
- Regression tests cover the new/required props (`sizes`, `priority`).
- UAT can validate cold/warm timing targets (<500ms cold, <200ms warm) after deployment/restart.

## Implementation Review (Post-Implementation)

### TDD Compliance Gate

- **Implementation doc present**: `agent-output/implementation/034-provider-image-load-performance-v0.6.12.md`
- **TDD Compliance table**: ✅ Present and complete (3 rows; includes bugfix-regression exception justification)

### Code Changes Summary (expected)

- WebP-only `next/image` formats.
- `sizes` and missing `priority` on hero images.
- Docker volume persistence for `.next/cache/images` across deploy paths (scripts + GitHub Actions).

## Test Coverage Analysis

### New/Modified Code Coverage

| File | Function/Class | Test File | Coverage Status |
| --- | --- | --- | --- |
| `src/components/providers/ProviderDetailModal.tsx` | Hero image `sizes` attribute | `src/__tests__/components/ProviderDetailModal.test.tsx` | COVERED |
| `src/components/providers/ProviderDetailPage.tsx` | Hero image `sizes` + `priority` attributes | `src/__tests__/components/ProviderDetailPageImages.test.tsx` | COVERED |
| `src/__tests__/utils/test-utils.tsx` | `next/image` mock forwards `sizes` and `priority` | (N/A) | SUPPORTING |

### Coverage Gaps

- None identified for the new hero-image attribute requirements.

## Test Execution Results

### Type Check

- **Command**: `npm run type-check`
- **Status**: PASS

### Unit Tests

- **Command**: `npx vitest run`
- **Status**: PASS
- **Summary**: 21 passed | 1 skipped (22 files); 172 passed | 18 skipped (190 tests)

### Build

- **Command**: `npm run build`
- **Status**: PASS
- **Notes**: Build output includes expected Next.js “Dynamic server usage” messages for routes using `headers`/`cookies` (non-blocking for this plan).

### Perf Budgets

- **Command**: `node scripts/perf/check-budgets.js`
- **Status**: PASS
- **Summary**:
	- `/providers`: 307 kB / 350 kB
	- `/providers/[provider_id]`: 182 kB / 220 kB
	- Shared JS: 105 kB / 120 kB

### Delta Lint

- **Command**: `npx eslint src/components/providers/ProviderDetailModal.tsx src/components/providers/ProviderDetailPage.tsx src/__tests__/utils/test-utils.tsx src/__tests__/components/ProviderDetailModal.test.tsx src/__tests__/components/ProviderDetailPageImages.test.tsx`
- **Status**: PASS (warnings only)
- **Warnings**:
	- `next.config.js` is ignored by ESLint ignore patterns.
	- `src/__tests__/utils/test-utils.tsx` warns about `<img>` usage (intentional in tests) and an unused eslint-disable directive.

---

## Manual / UAT Validation Notes

**DEFERRED (requires UAT environment)**:

- Measure cold and warm `/_next/image` request latency on the referenced UAT provider page.
- Verify `CF-Cache-Status` behavior is acceptable (Cloudflare caching for `/_next/image` is optional per plan).

---

Handing off to uat agent for value delivery validation.
