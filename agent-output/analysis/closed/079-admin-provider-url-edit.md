---
ID: 079
Origin: 079
UUID: 4a8f1c3e
Status: Planned
---

# 079 — Admin Provider URL Edit Bug

## Changelog

| Date | Agent | Action | Outcome |
|------|-------|--------|---------|
| 2026-04-04 | Analyst | Initial RCA | L1 root cause proven — analysis complete |
| 2026-04-04T11:35Z | Planner | Status → Planned | Plan 079 created; analysis closed |

---

## Value Statement and Business Objective

Admins are blocked from approving or rejecting provider submissions when the website field contains a URL without a scheme (e.g. `www.yaneel.com`). This halts the moderation pipeline entirely, requiring an admin workaround (manually adding `https://`) or leaving providers stuck in pending state. The fix restores admin operational throughput.

---

## Context

- **Feature**: Admin provider edit + moderation flow (`/dashboard/providers/[id]/edit`)
- **Reporter symptom**: Browser validation popup "Please enter a URL." appears on the website field; save / approve / reject cannot complete; no JavaScript console errors
- **Branch**: `session/79-admin-provider-url-edit`
- **Screenshot evidence**: User typed `www.yaneel.com`; tooltip fired

---

## Methodology

- Static code trace from symptom → form component → input definition → submit guard
- Searched for all usages of `type="url"` and `reportValidity` in the form
- Located existing `normalizeWebsiteUrl` utility and confirmed it is NOT wired into the edit form
- Checked test coverage for the broken code path
- Confidence per finding: L1 (code directly read and cross-referenced)

---

## Findings

### Finding 1 — `type="url"` on website input [**L1 Proven**]

**File**: `src/components/providers/ProviderEditForm.tsx`, line 602

```tsx
<input
  type="url"                              // ← HTML5 URL constraint
  value={formData.website}
  onChange={(e) => handleInputChange('website', e.target.value)}
  placeholder={t('editProvider.websitePlaceholder')}
  className="..."
/>
```

HTML5 `<input type="url">` requires the value to be a *valid absolute URL*, which mandates a scheme (`http://` or `https://`). Values such as `www.yaneel.com` (no scheme) fail the browser's built-in constraint check silently in JavaScript but visibly via native tooltip to the user.

---

### Finding 2 — `reportValidity()` gates the entire save flow [**L1 Proven**]

**File**: `src/components/providers/ProviderEditForm.tsx`, lines 318–331

```tsx
const handleReviewFooterAction = async (
  actionKey: 'reject' | 'approve',
  action: ProviderEditFooterAction
) => {
  if (isSubmitting) return;
  if (formRef.current && !formRef.current.reportValidity()) {
    return;  // ← EXITS HERE when website is a schemeless URL
  }
  // ... approve/reject action never reached
};
```

`reportValidity()` calls the browser's built-in constraint validation on the entire form. When the `type="url"` input has a schemeless value, the browser:
1. Displays the native tooltip: "Please enter a URL."
2. Returns `false` from `reportValidity()`
3. Causes early return — neither the save nor the approve/reject API call is ever made

This explains why there are no console errors: no JavaScript exception is thrown. The guard exits cleanly.

---

### Finding 3 — `normalizeWebsiteUrl` utility exists but is not used in the form [**L1 Proven**]

**File**: `src/utils/navigationUtils.ts`, lines 116–128

```ts
export const normalizeWebsiteUrl = (website: string | null | undefined): string | null => {
  if (!website || !website.trim()) return null;
  const trimmed = website.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;  // ← already handles schemeless URLs
};
```

This utility is already used in **display/navigation** contexts:
- `src/components/providers/ProviderDetailPage.tsx` line 382
- `src/components/providers/ProviderDetailModal.tsx` line 293
- `src/components/community-services/CommunityServiceDetailModal.tsx` line 252

It is **not** wired into `ProviderEditForm.tsx` at any point (neither `onChange`, `onBlur`, nor submit).

---

### Finding 4 — Two distinct manifestation paths [**L1 Proven**]

#### Path A: Existing stored data without scheme
Providers with `social_website = 'www.example.com'` (no scheme) in the database are pre-populated into the form:

```tsx
// ProviderEditForm.tsx line ~111
website: provider.social_website || '',
```

When admin opens any such provider for review, the website input is immediately pre-populated with a schemeless URL → `reportValidity()` fails → the admin cannot approve or reject without first manually prefixing `https://`.

#### Path B: Admin types a new schemeless URL
Admin enters `www.yaneel.com` → `type="url"` constraint fails → submit blocked.

---

### Finding 5 — `ProviderCreateForm.tsx` has the same `type="url"` issue [**L1 Observed**]

**File**: `src/features/providers/ProviderCreateForm.tsx`, line 646

Same `type="url"` pattern. This is a separate flow (provider creation, not admin edit), so it is **in-scope to flag** but **out of scope for this fix plan** unless the Planner explicitly includes it.

---

### Finding 6 — No tests cover the blocked path [**L1 Proven**]

**File**: `src/__tests__/components/ProviderEditForm.regression.test.tsx`

The `baseProvider` fixture used in all existing regression tests has:
```ts
social_website: '',  // ← empty string, passes type="url" validation trivially
```

No test exercises the moderation approval/rejection flow with a non-empty, schemeless URL in `social_website`. The broken path is invisible to the test suite.

---

## Root Cause (L1 Proven)

The website `<input type="url">` in `ProviderEditForm` enforces HTML5 URL constraint validation. The `handleReviewFooterAction` guard calls `formRef.current.reportValidity()` before executing any moderation action. When `social_website` contains a schemeless URL (either from the database or typed by the admin), the browser reports the input as invalid, shows "Please enter a URL.", and `reportValidity()` returns `false`, blocking all downstream save / approve / reject calls.

A normalization utility (`normalizeWebsiteUrl`) already exists in the codebase and handles this case, but it is not applied in the form's input or submit flow.

---

## System Weaknesses

| # | Weakness | Risk Mechanism |
|---|----------|----------------|
| 1 | `type="url"` prohibits user-intuitive input | Admins and providers expect to type `www.example.com` without scheme; browser strict URL rules don't match real-world UX expectations |
| 2 | `normalizeWebsiteUrl` is display-only | Normalization is applied when displaying/opening URLs but not when accepting input — creates divergence between stored format and expected input format |
| 3 | `reportValidity()` fires on all fields including optional contact | A non-required optional field blocks the entire form action with no workaround short of clearing the field or adding a scheme |
| 4 | No regression tests for schemeless URL in moderation flow | The fixture always uses `social_website: ''`, so the class of website-validation bugs remains invisible to CI |

---

## Impact Assessment

| Dimension | Assessment |
|-----------|------------|
| **Severity** | High — completely blocks admin moderation of affected providers |
| **Affected users** | All admins; affects any provider with `www.` or other schemeless website URL |
| **Workaround available** | Yes — manually prefix `https://` before approving/rejecting |
| **Data at risk** | No data corruption; purely a UX/workflow block |
| **Scope of change** | Minimal — one input element; normalization utility already exists |

---

## Analysis Recommendations (next steps only)

1. **Verify database prevalence**: Run a Postgres query against `providers.social_website` to count rows where `social_website NOT LIKE 'http%' AND social_website IS NOT NULL`. This determines how many existing providers would present the bug on open.
2. **Confirm `ProviderCreateForm` scope**: Decide whether the create flow should be included in the same fix or tracked separately. It has the same `type="url"` issue.
3. **Verify test gap with a failing test**: Write a test with `social_website: 'www.example.com'` and attempt to approve → confirm it does not call the action → this is the regression test baseline.
4. **Confirm normalization approach is acceptable**: The `normalizeWebsiteUrl` utility is the natural fix location — confirm with Planner that adding `onBlur` normalization (or pre-submit normalization) is the intended approach vs. changing `type="url"` to `type="text"`.

---

## Open Questions

None. Root cause is L1 Proven. All primary unknowns resolved through direct code trace.

---

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | How many live providers have schemeless `social_website` values? | Non-blocking | DB query: `SELECT COUNT(*) FROM providers WHERE social_website IS NOT NULL AND social_website NOT LIKE 'http%'` | Planner/DevOps |
| 2 | Should `ProviderCreateForm.tsx` be fixed in the same plan? | Non-blocking | Planner decides scope | Planner |
