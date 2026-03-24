---
ID: 055
Origin: 055
UUID: b7e4a3f1
Status: Committed
---

# UAT Report: Plan 055 — Home page category gallery image HTTP 400 bugfix

**Plan Reference**: `agent-output/planning/055-category-image-400-plan.md`
**Date**: 2026-03-24
**UAT Agent**: Product Owner (UAT)

## Changelog

| Date       | Agent Handoff    | Request              | Summary                        |
| ---------- | ---------------- | -------------------- | ------------------------------ |
| 2026-03-24T12:40Z | QA → UAT | Value and objective validation for Plan 055 | UAT Complete — implementation delivers stated value; `clothing.jpg` data fix + UI fallback hardening confirmed by doc evidence and live URL check. One version-target inconsistency flagged for DevOps Stage 1. APPROVED FOR RELEASE. || 2026-03-24T13:00Z | devops | Document closed | Status: Committed — Stage 1 complete for v0.8.25 |
## Value Statement Under Test

> As a **home page visitor**, I want **every category gallery on the landing experience to load real images or a graceful fallback**, so that **UFlow feels trustworthy, polished, and reliable when I browse providers and community services**.

## UAT Scenarios

### Scenario 1: Clothing & Fashion gallery loads a valid image after migration

- **Given**: Migration 061 has been applied to the target database
- **When**: A visitor opens the UFlow home page and the category gallery renders
- **Then**: The Clothing & Fashion row serves `clothing.jpg` from the Supabase Storage `category-images` bucket; no `/_next/image` HTTP 400 is produced
- **Result**: CONDITIONAL PASS *(pending migration application; all blockers are operational, not implementation quality)*
- **Evidence**:
  - `curl https://rdtdtcfntopcxcigkqoq.supabase.co/storage/v1/object/public/category-images/clothing.jpg` → HTTP 200 (QA confirmed)
  - `supabase/migrations/061_fix_clothing_category_image_reference.sql` reviewed and approved — updates `category_images` JSONB to the confirmed live asset with dual-guard `WHERE` clause (`category_id` UUID + `name_de`) and `RETURNING` clause for operator verification
  - The broken old object (`a65-design-2NLeXS3NR5E-unsplash.jpg`) returned HTTP 400 (root-cause confirmed in Analysis 055)

### Scenario 2: Any gallery tile with a broken remote URL falls back gracefully

- **Given**: A category's `category_images` JSONB contains a URL that no longer resolves  
- **When**: `UnifiedGallery` renders the tile and the `<Image>` component fires an `onError` event
- **Then**: The component swaps the broken source to `/images/placeholder.jpg` so users see a placeholder tile rather than a broken image icon
- **Result**: PASS
- **Evidence**:
  - `src/__tests__/components/UnifiedGallery.test.tsx` — `[post-fix PASSES] broken remote image falls back to placeholder on error` passes ✅
  - `src/__tests__/components/UnifiedGallery.test.tsx` — `[post-fix PASSES] already-placeholder image does not re-trigger fallback` passes ✅ (guards against infinite re-render)
  - Pre-fix behaviour documented: `[pre-fix FAILS] broken remote image shows broken img instead of placeholder` ✅ (demonstrates regression visibility)

### Scenario 3: Existing working categories remain unaffected

- **Given**: Health & Sports, Community Support, and other categories already use valid image URLs
- **When**: The home page gallery renders all category rows
- **Then**: Those rows continue to display their valid images without any regression introduced by the `onError` handler
- **Result**: PASS
- **Evidence**:
  - `curl https://rdtdtcfntopcxcigkqoq.supabase.co/storage/v1/object/public/category-images/sports.jpg` → HTTP 200 (QA confirmed)
  - `curl https://rdtdtcfntopcxcigkqoq.supabase.co/storage/v1/object/public/category-images/community_services.jpg` → HTTP 200 (QA confirmed)
  - Full vitest run: 314 tests passed, 18 skipped, 0 failed — no regressions
  - `onError` handler uses a `failedIndexes` Set guard to only fire once per tile; `key={categoryId}` on parent remounts the component on category switch, so no stale state bleeds across categories (Code Review [INFO] finding confirmed benign)

### Scenario 4: Data correction is reproducible from tracked repo artifacts

- **Given**: The Clothing & Fashion `category_images` column was updated by a console-only action historically
- **When**: A developer or DevOps operator needs to reproduce or roll forward the fix
- **Then**: Running `supabase/migrations/061_fix_clothing_category_image_reference.sql` against the target database is sufficient; no undocumented state exists
- **Result**: PASS
- **Evidence**:
  - Migration exists at `supabase/migrations/061_fix_clothing_category_image_reference.sql` ✅
  - `sql/queries/sync-categories-dev-to-prod.sql` updated to reflect `clothing.jpg` ✅
  - Code Review confirmed the dual-condition `WHERE` and `RETURNING` clause: operator can verify exactly 1 row returned with `name_de = 'Kleidung & Mode'` and `category_images` pointing to `clothing.jpg`

## Value Delivery Assessment

The implementation fully delivers the value statement. The two-part fix resolves both the immediate production breakage and the underlying UI weakness:

1. **Data fix** resolves the root cause. Before migration 061 is applied, production still returns HTTP 400 for the Clothing & Fashion gallery — but this is an operational execution gap (migration not yet applied), not an implementation quality gap. The fix is correct, reviewed, and approved.

2. **UI fallback hardening** delivers the "graceful fallback" half of the value statement. Even before migration 061 is applied, users with any currently-broken category image will now see a placeholder tile instead of a broken image icon. This is a behavioural improvement that ships with the app deploy independently of the migration.

**Is core value deferred?** No. The app-side value (fallback resilience) is delivery-complete. The data-side value (clothing.jpg rendered on prod) is conditionally complete — it depends on migration application, which is an expected operational step for this codebase's migration strategy, not a deferred design decision.

## QA Integration

**QA Report Reference**: `agent-output/qa/055-category-image-400-qa.md`  
**QA Status**: QA Complete  
**QA Findings Alignment**: All QA findings are aligned with code review. No gaps between QA observed behaviour and code review findings. The one non-blocking lint warning (test-only `@next/next/no-img-element`) does not affect production code.

**Remediation Review**: Not applicable — QA passed on first run; no previous QA failure.

## Technical Compliance

| Plan Deliverable | Implementation Evidence | Status |
|---|---|---|
| Correct broken Clothing & Fashion `category_images` reference | Migration 061; sync SQL updated | ✅ PASS |
| Add gallery fallback hardening (`onError` → placeholder) | `UnifiedGallery.tsx` |  ✅ PASS |
| Add regression coverage for bug path | 15 tests across 2 test files | ✅ PASS |
| Verifiable data correction (not undocumented console state) | Migration in `supabase/migrations/` with `RETURNING` | ✅ PASS |
| No regressions to working categories | 314/314 tests passing | ✅ PASS |
| Type-check clean | `tsc --noEmit` exit 0 | ✅ PASS |
| Lint clean (production files) | 0 errors on all touched production files | ✅ PASS |

**Known limitations**:
- Live post-deploy browser verification is deferred to DevOps execution (no live browser environment available in this workspace, consistent with all prior plans in this repo)
- Migration 061 is manually applied — not auto-applied by CI/CD (consistent with all other migrations)

## Objective Alignment Assessment

**Does code meet original plan objective?**: YES

**Evidence**:
- Plan Objective: "Fix so all category images load correctly via `/_next/image`, then deploy to production" — implementation replaces the stale broken URL with a confirmed-live asset and adds fallback protection for any future stale reference
- Plan Acceptance Criteria — cross-checked:
  - ✅ Clothing & Fashion no longer depends on broken URL in tracked artifacts (migration 061)
  - ✅ Affected category row will render valid image tiles after migration applied
  - ✅ If a gallery image URL breaks in future, UI renders local placeholder (onError)
  - ✅ Existing working category rows unaffected (314 tests, sports.jpg + community_services.jpg confirmed 200)
  - ✅ Data correction is reproducible from tracked repo artifacts
  - ⏳ Shipping under next patch after v0.8.23 — pending DevOps Stage 1 version confirmation (see Version Finding below)

**Drift Detected**:
- **None** in implementation scope or strategy. The one advisory from Critique 055 (deferred asset decision M1) was resolved by implementation using `clothing.jpg`, which was subsequently confirmed by the user as the correct asset and re-verified live (HTTP 200).

## Version Target Finding (Non-Blocking)

**Finding**: The plan targets `v0.8.24` based on a planning-time git/tag preflight that recorded `origin/main` at `v0.8.23`. However, current workspace evidence shows `package.json` version `0.8.7` and `CHANGELOG.md` latest entry `[0.8.7]`. No version between `0.8.7` and `0.8.23` appears in CHANGELOG or deployment docs. This suggests either the planning preflight captured an incorrect tag state, or the repo uses a non-sequential supplementary tag convention for internal tracking.

**Impact on UAT**: None — the plan's own text contains the safety valve: *"confirm exact tag at DevOps Stage 1"*. UAT approval is not gated on version number assignment.

**Required action**: **DevOps Stage 1 MUST perform a fresh git/package.json version preflight** and set the correct next patch version before bumping or tagging. Expected correct next version based on current evidence: `v0.8.8`, not `v0.8.24`.

## UAT Status

**Status**: UAT Complete  
**Rationale**: All three plan deliverables are implemented, reviewed, and tested. The value statement is demonstrably delivered by doc evidence — live URL check confirms the replacement asset is live, regression tests confirm the fallback path works, and the full test suite confirms no regressions. The only gap is operational (migration not yet applied to production), which is expected and properly documented by QA with an explicit owner, fallback, and verification path. This is not a UAT blocking condition.

## Release Decision

**Final Status**: APPROVED FOR RELEASE  
**Rationale**: QA gate passed (314/314). Code Review APPROVED. Implementation delivers both acceptance criteria halves (data fix + UI fallback). No functional drift. The sole residual risk (migration must be applied before the visual fix is live) is expected, documented, and executable by DevOps.

**Recommended Version**: **Confirmed at DevOps Stage 1** — do not assume `v0.8.24`; re-run `git describe --tags` and check `package.json` to determine correct next patch (expected `v0.8.8` based on current workspace evidence, but must be verified).

**Key Changes for Changelog** (for `v0.8.x` entry):
- **Fixed**: Clothing & Fashion category gallery on the home page no longer returns `/_next/image` HTTP 400. Root cause was a stale `category_images` reference pointing to a missing Supabase Storage object (`a65-design-2NLeXS3NR5E-unsplash.jpg`). Fixed by updating the `category_images` JSONB to the confirmed live replacement asset `clothing.jpg` via migration 061.
- **Improved**: `UnifiedGallery` now handles broken remote image URLs gracefully: any failed `<Image>` load falls back to the local placeholder tile instead of rendering a broken image icon. Protects against future stale storage references across all category gallery rows.

## Next Actions

### Deferred Follow-ups (Non-Blocking)

| Item | Owner | Trigger / Due Window | Evidence to Close | Recommended Next-Plan |
|---|---|---|---|---|
| Post-deploy browser verification: Clothing & Fashion renders `clothing.jpg` with no `/_next/image` 400; Health & Sports still renders correctly | DevOps / QA Lead | Immediately after migration applied + app deployed | Browser network tab shows 200 for `clothing.jpg`; no 4xx for Clothing & Fashion row | Captured in DevOps deployment doc; no separate plan needed |
| Upload a proper Clothing & Fashion branded category image to replace `clothing.jpg` | Product Owner | Next content sprint / when brand assets are available | New image URL returns HTTP 200 and passes visual review | New minor product content task |
| Add `@internal` JSDoc to `parseCategoryImages` export + rename misleading `describe` block in `parseCategoryImages.test.ts` | Implementer | Next touch of these files | Linter or code review signs off | No dedicated plan; fold into first related PR |
| Extend shared `test-utils` mock to forward `onError` so `UnifiedGallery.test.tsx` can drop its local mock | Implementer | QA backlog sprint | Shared mock forwards `onError`; local override removed | No dedicated plan |

Handing off to devops agent for release execution

---

✅ PHASE COMPLETE: ⑧ UAT — Verdict: APPROVED FOR RELEASE  
📄 Output: agent-output/uat/055-category-image-400-uat.md  
➡️ NEXT: Pick "⑨ DevOps" from the Orchestrator handoff suggestions  
   Gate: Status must be Committed or Released
