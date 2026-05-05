---
ID: 082
Origin: 081
UUID: b4e91f3a
Status: Test Strategy Development
---

# QA Report: Plan 082 — Community Service Detail Parity

**Plan Reference**: `agent-output/planning/082-community-service-detail-parity-plan.md`  
**Implementation Reference**: `agent-output/implementation/082-community-service-detail-parity-implementation.md`  
**Code Review**: `agent-output/code-review/082-community-service-detail-parity-code-review.md` (Verdict: APPROVED)  
**Open Actions**: `agent-output/planning/082-open-actions.md`

**QA Specialist**: qa  
**QA Status**: Test Strategy Development  
**Session Context Header**: Session: S81-community-service-open

## Changelog

| Date (UTC) | Agent Handoff | Request | Summary |
|------------|---------------|---------|---------|
| 2026-04-05T22:30Z | Implementer → QA | Code review APPROVED, ready for QA | Test strategy for Plan 082 UAT workflows + automated gates |

## Timeline

- **Test Strategy Started**: 2026-04-05T22:30Z
- **Test Strategy Completed**: _pending_
- **Implementation Received**: 2026-04-05T22:20Z (commit f286a7fb)
- **Testing Started**: _pending Phase 2_
- **Testing Completed**: _pending Phase 2_
- **Final Status**: _pending_

---

## Test Strategy (Pre-Implementation)

### Overview

Plan 082 removes a hard `notFound()` wall and replaces a legacy desktop modal with the provider detail design system. The value to users: community services now display with consistent UX, loading states, and full design system compliance (badges, images, analytics, admin actions).

**Test approach from user perspective:**
1. **User with non-approved service**: Can they see loading → content instead of 404?
2. **User viewing approved service**: Is the UX parity with provider detail truly achieved (both desktop and mobile)?
3. **Admin user**: Are admin action buttons visible and functional?
4. **Bookmark user**: Does the bookmark persist with the correct entity type?

### Test Types and Coverage

#### Tier 1: Automated Unit + Integration (Already Passing)

- **Framework**: Vitest + @testing-library/react + jsdom
- **Current Status**: ✅ 805 tests passing (21 new from Plan 081 baseline)
  - 5 tests for `useCommunityService()` hook
  - 11 tests for `buildProviderShapeFromCommunityService()` transform
  - 4 tests for `AdminCommunityServiceDetailButtons` (new)
  - 2 server-path tests for nullable initialData pattern
- **Coverage**: Hooks, data transforms, component props, server-side patterns
- **Confidence**: High — TDD gate verified all tests fail then pass

#### Tier 2: Manual UAT (MW-1 through MW-4)

**UAT workflows from `082-open-actions.md`:**

| ID | Workflow | User Context | Desktop? | Mobile? | Expected Outcome |
|----|----------|--------------|----------|---------|------------------|
| MW-1 | Owner opens their own non-approved community service | Logged-in provider owner | ✅ | ✅ | Renders with loading skeleton, then content visible (no 404 wall) |
| MW-2 | Anonymous user opens approved community service | Public user, no auth | ✅ | ✅ | Same design and UX quality as provider detail page |
| MW-3 | Admin opens any community service | Logged-in admin | ✅ | ✅ | Admin action **"Edit"** button visible; click routes to `/dashboard/community-services/[id]/edit` (⚠️ route not yet built — OA-1) |
| MW-4 | Bookmark a community service | Logged-in user | ✅ | ✅ | Bookmark persists as `bookmarkableType: 'community_service'` (not `provider`) |

**Test execution approach:**
- Browser-backed manual validation (Firefox + Chrome/Safari for mobile profile)
- Validate exact workflows from published acceptance criteria
- Record pass/fail and any user-visible degradation vs provider detail page
- Document any deviations or edge cases

#### Tier 3: Regression Coverage

- **Framework**: Vitest (automated)
- **Scope**: Existing community service tests + updated provider detail tests
- **Key paths to validate**:
  - `CommunityServiceDetailModal` deprecated (no active imports, no unexpected breakage)
  - `useCommunityService` hook mirrors `useProvider` hook behavior
  - `buildProviderShapeFromCommunityService` maps all fields correctly
  - `ProviderDetailModal` bookmarkableType detection works for both provider and community service
  - Admin check via `useIsAdmin()` applies correctly

### Testing Infrastructure Requirements

**Test Frameworks Installed** ✅
- Vitest 3.2.4 (already installed)
- @testing-library/react (already installed)
- jsdom (already installed)
- @iconify/react (already installed for icon component)

**Configuration Files**
- `vitest.config.ts` (already configured)
- `tsconfig.json` (already configured, strict mode enabled)

**Build Tooling**
- `npm run type-check` — TypeScript validation (0 errors ✅)
- `npm run lint` — ESLint (0 new errors ✅)
- `npm test` / `npx vitest run` — Unit + integration tests (805 passing ✅)
- `npm run build` — Full build (deferred to DF-4 exception per QA constraints)

**Manual Testing Environment**
- Browser: Firefox (standard + ETP privacy profile for edge case)
- Browser: Chrome or Safari (mobile profile)
- Test account: Community service owner + admin user needed
- UAT instance: `https://uat.ummahflow.com` or local dev with `.env.local`

**No new dependencies required.** All tooling already in place.

---

## Acceptance Criteria

### Automated Gates (Go/No-Go)

1. ✅ Type-check passes: `npm run type-check` exits 0
2. ✅ Lint passes (delta): `npm run lint` shows 0 new errors
3. ✅ Unit tests pass: `npx vitest run` exits 0 with all 805 tests passing
4. ⚠️ Build gate: `npm run build` — deferred per DF-4 (Supabase credential dependency local-only constraint)

### Manual UAT Gates (All 4 Workflows Required)

- [ ] MW-1: Non-approved CS renders (desktop + mobile, loading → content)
- [ ] MW-2: Approved CS parity (desktop + mobile, design system quality match)
- [ ] MW-3: Admin buttons visible (desktop + mobile, click routes to pending /dashboard/... route)
- [ ] MW-4: Bookmark persists as community_service type

### Coverage Sufficiency

- Server-side nullable initialData pattern: ✅ Covered by 2 regression tests
- React Query hook behavior: ✅ Covered by 5 focused tests
- Data transform: ✅ Covered by 11 transform tests
- Admin state branch: ✅ Covered by 4 new tests + MW-3 manual path
- Design system compliance: 🔄 Requires MW-2 manual validation (jsdom cannot fully validate rendered design, CSS specificity, spacing)
- Bookmark persistence: 🔄 Requires MW-4 manual validation (requires real app state + database)

---

## Risks & Mitigations

| Risk | Impact | Mitigation | Status |
|------|--------|-----------|--------|
| Admin CS edit route `/dashboard/community-services/[id]/edit` does not exist (OA-1) | MW-3 will 404 on click | Document as known; track OA-1 for future admin dashboard plan | ℹ️ Expected |
| Recommendation-mode RLS edge case (DF-1) | Null data for certain services even after auth fix | Defer investigation to post-UAT; tracked in DF-1 | ℹ️ Expected |
| Local `.env.local` missing Supabase credentials | `npm run build` + local dev cannot run | Use DF-4 exception; rely on automated tests + browser UAT | ✅ Mitigated |
| Browser profile mismatch (ETP vs standard) | Privacy settings could affect network interception or resource loading | Test both profiles (standard + ETP) for MW-1 through MW-4 | 📋 In scope |
| Mobile responsiveness edge case | CSS media queries or touch interactions might fail on actual mobile | Use browser DevTools mobile profile + actual mobile device if available | 📋 In scope |

---

## Notes for Implementation Completeness

### TDD Compliance Verified

- ✅ `useCommunityService()`: Test written first, failing, then passing (5 tests)
- ✅ `buildProviderShapeFromCommunityService()`: Test written first, failing, then passing (11 tests)
- ✅ `AdminCommunityServiceDetailButtons`: Test written first, failing then passing (4 tests)
- ✅ Nullable initialData server pattern: Regression test updated (2 tests)

### Code Quality Gates Passed

- ✅ Type-check: 0 errors
- ✅ Lint: 0 new errors (20 pre-existing warnings, baseline unchanged)
- ✅ Tests: 805 passing (+21 from Plan 081)

### Coverage Analysis

| Category | Automated | Manual | Total Coverage |
|----------|-----------|--------|-----------------|
| Hook behavior | ✅ 5 tests | - | High |
| Data transform | ✅ 11 tests | - | High |
| Admin state branching | ✅ 4 tests | MW-3 | High |
| Design system parity | ❌ (jsdom limitation) | MW-2 | Medium (manual required) |
| Bookmark persistence | ❌ (requires real DB) | MW-4 | Medium (manual required) |
| End-to-end user flow | ❌ (requires auth) | MW-1, MW-2, MW-3, MW-4 | Medium (manual required) |

**Gaps that manual UAT closes:**
- Real React Query network requests + cache invalidation
- Real Supabase data fetch + error states
- Real bookmark storage + type persistence
- Real auth state for admin user flows
- Real CSS rendering + responsive behavior

---

## Pre-Phase 2 Readiness Checklist

- [x] Plan and implementation code reviewed (Code Review: APPROVED)
- [x] Automated tests all passing (805/805)
- [x] Type-check and lint gates passed
- [x] UAT workflows documented (MW-1 through MW-4 in 082-open-actions.md)
- [x] Known issues tracked (OA-1: admin route pending; DF-1: RLS edge case)
- [x] Infrastructure in place (Vitest, Testing Library, browsers)
- [x] Manual testing scope defined (desktop + mobile for all 4 workflows)
- [ ] Test account provisioned (pending UAT env readiness)
- [ ] Browser test environment ready (pending UAT instance access)

---

## Phase 2 Execution Plan (Pending)

When Phase 2 begins:

1. **Setup** (5 min): Verify UAT instance access, test account provisioning, browser DevTools mobile profile ready
2. **Execute MW-1** (10 min): Owner opens non-approved CS → validate loading → content flow
3. **Execute MW-2** (15 min): Anonymous opens approved CS → compare desktop/mobile UX vs provider detail
4. **Execute MW-3** (10 min): Admin opens CS → validate button presence, click → 404 (expected due to OA-1)
5. **Execute MW-4** (10 min): Bookmark CS → database query to verify type persistence
6. **Document findings** (10 min): Record pass/fail, any UX gaps, edge cases observed
7. **Final verdict** (5 min): All 4 passing = QA Complete; any failing = QA Failed with required fixes

**Total Phase 2 time estimate**: ~60 minutes

---

## Next Steps

→ Await Phase 2 trigger: QA execution of MW-1 through MW-4  
→ Upon completion: QA verdict → UAT (if approved) or back to Implementer (if failed)
