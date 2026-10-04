---
ID: 209
Origin: 209
UUID: b7e3f41a
Status: Resolved
---

# Critique: Plan 209 — Near Me Permission-Denied UX Guidance

| Field | Value |
|---|---|
| Artifact | `agent-output/planning/209-near-me-denied-ux-guidance-plan.md` |
| Date | 2026-08-16T17:15Z |
| Status | R1 |
| Verdict | **APPROVED** |

## Changelog

| Date (UTC) | Handoff | Request | Summary |
|---|---|---|---|
| 2026-08-16T17:00Z | planner → critic | Initial review | Plan created from DF-3 on-device finding |
| 2026-08-16T17:15Z | critic → planner | Revision R1 | F1: separate keys committed; F2: denied-only scope + guard ACs added; F3: RTL TODO note added |
| 2026-08-16T17:15Z | planner → critic | R1 re-review | All findings addressed; no new findings |

---

## Value Statement Assessment

**STRONG.** The value statement is grounded in a real, observed failure (DF-3 on-device UAT, iPhone SE PWA, 2026-08-16). The user-story format is correct. The "so that" delivers direct value: users can recover from a permission-denial dead-end rather than abandoning the Near Me feature entirely. This is a genuine usability gap that Plan 212 exposed by making the denied state visible.

---

## Overview

Plan 209 is a focused follow-on from Plan 212 (v0.15.14). The scope is well-contained: add contextual guidance text when geolocation permission is denied on mobile PWA. No DB migrations, no API changes, no breaking contracts. The architecture fit is correct — the plan touches exactly the right files (`HomeSearchBar`, `NearMeOpenNowFilters`, i18n locale files). Duration estimates are present and realistic.

Two findings block implementation as written. Both are concise to resolve.

---

## Architectural Alignment

Plan 209 correctly builds on the Plan 212 state machine without modifying it. It adds a display layer on top of existing `geoStatus` values. This is consistent with the architecture pattern established in Plan 212:

- `useGeolocation` → status authority (untouched)
- `RootPageContent` → geolocation owner (untouched)
- `HomeSearchBar` + `NearMeOpenNowFilters` → display layer (Plan 209 extends these)
- `translations/*.ts` → i18n surface (Plan 209 adds keys)

The `LanguageProvider.t()` function already supports `{{variableName}}` interpolation — no changes needed to the i18n infrastructure.

`NearMeOpenNowFilters` receives `t` as a prop (not via `useLanguage` hook). Any platform detection logic must be called before or at the component's call site, or wrapped so it works in both hook and prop contexts. The plan is silent on this but the Implementer can resolve it without a plan revision.

---

## Scope Assessment

Scope is appropriate for a patch bugfix. No over-engineering risk. The YAGNI boundary is respected — platform detection is the minimum needed to differentiate the hint text; the plan does not add analytics, modals, or retry-with-reset behaviour.

---

## Technical Debt Risks

Minimal. User-agent detection for hint text is a "good enough" pattern here (acknowledged in Risks). The translation gap for RTL locales (ar, ur, ps) is accepted at LOW risk — the fallback key covers worst case.

---

## Findings

### F1 — D4 contradicts M1: key structure decision is not resolved [MEDIUM]

| Field | Value |
|---|---|
| Status | OPEN |
| Section | D4 (Decision Record) vs M1 (Milestone 1) |
| Severity | MEDIUM |

**Issue**: D4 is marked `[RESOLVED]` as "New i18n key `suchen.nearMe.permissionDeniedHint` with platform interpolation" — implying a **single key** with a variable substituion. However, M1 immediately undercuts this: "the i18n key itself is a single string with a `{platform}` interpolation **or** separate keys per platform." That "or" means the decision is NOT resolved.

This matters for implementation scope: the two approaches produce structurally different locale files and different component code:

- **Single key + interpolation**: One entry per locale (`permissionDeniedHint: "Standort gesperrt. {{settingsPath}}"`) — but the platform-specific text is a full independent sentence in each language, making the interpolated fragment untranslatable in isolation for RTL locales (word order issues).
- **Separate keys per platform**: Three entries per locale (`permissionDeniedHintIos`, `permissionDeniedHintAndroid`, `permissionDeniedHintFallback`) — 18 translation entries total, cleanly localizable per sentence.

The Desired Behaviour section shows three completely different sentences across platforms, which makes **separate keys the correct approach** — the sentences are not structurally decomposable into a shared prefix + variable suffix across all 6 locales.

**Impact**: If the Implementer picks the wrong approach, locale file structure and component code diverge from intent. Rework required to migrate keys.

**Recommendation**: Revise D4 to `[RESOLVED — separate keys per platform: permissionDeniedHintIos, permissionDeniedHintAndroid, permissionDeniedHintFallback]`. Update M1 Acceptance Criteria to list the three keys explicitly and drop the "or" branch.

---

### F2 — Hint scope ambiguity: guidance shown for `timeout` and `unavailable`, not just `denied` [MEDIUM]

| Field | Value |
|---|---|
| Status | OPEN |
| Section | M2, Decision Record |
| Severity | MEDIUM |

**Issue**: The plan title and value statement scope this to "permission-denied" UX. However, both `HomeSearchBar` and `NearMeOpenNowFilters` show the denied state for **three** `geoStatus` values: `denied`, `timeout`, and `unavailable`.

- `denied` (PERMISSION_DENIED, code 1) → "Go to Settings" guidance is correct
- `timeout` (TIMEOUT, code 3) → guidance telling the user to check Settings is **wrong**; the correct action is to retry
- `unavailable` (POSITION_UNAVAILABLE, code 2) → could be hardware absent, airplane mode, or poor signal — telling the user to check Settings is misleading

Showing the Settings guidance for a timeout or a signal problem actively misinforms users.

**Impact**: Users in a timeout or low-signal scenario see a Settings prompt that will not help them, reducing trust in the guidance.

**Recommendation**: Either:
(A) Scope the hint to `denied` only (and leave `timeout`/`unavailable` with the current bare label — or add separate, appropriate messages for those states in a future plan), **or**
(B) Add a separate `geoStatus === 'timeout'` hint key (`permissionDeniedHintTimeout`) that says "Erneut versuchen" / "Try again" rather than Settings guidance.

Option A is simpler and within the plan's stated scope. Add one line to D3 or M2: "Hint renders only when `geoStatus === 'denied'`."

---

### F3 — RTL locale translations are placeholder risk [LOW]

| Field | Value |
|---|---|
| Status | OPEN |
| Section | Risks, Milestone 1 |
| Severity | LOW |

**Issue**: ar, ur, ps locale files will need translatable Settings path text (e.g., "الإعدادات → الخصوصية → خدمات الموقع" for Arabic iOS). The plan acknowledges the RTL risk but the mitigation ("follow existing locale file structure") doesn't address the translation quality gap.

**Impact**: Low — the fallback key covers the case where RTL-locale text is wrong. But the guidance may be unhelpful to Arabic/Urdu/Pashtu users.

**Recommendation**: Note explicitly that ar/ur/ps translations for the Settings path text require human review. Acceptable to ship with the same text as the `fallback` variant for RTL locales initially, with a follow-up translation pass.

---

## Unresolved Open Questions

No explicit `OPEN QUESTION` items in the plan. However D4 is **functionally unresolved** (see F1).

---

## Risk Assessment

| Risk | Severity | Mitigation in plan |
|---|---|---|
| Key structure ambiguity → locale rework | MEDIUM | Not mitigated (F1) |
| Hint shown for timeout/unavailable → misleads users | MEDIUM | Not mitigated (F2) |
| RTL locale quality | LOW | Acknowledged, mitigation weak |
| UA detection imprecision | LOW | Covered by fallback |
| Rollback complexity | NONE | Single commit revert, no DB changes |

---

## Recommendations

1. **Resolve F1** (key structure): Commit to separate keys per platform in D4. Update M1 Acceptance Criteria to list `permissionDeniedHintIos`, `permissionDeniedHintAndroid`, `permissionDeniedHintFallback`.
2. **Resolve F2** (scope): Add one sentence to M2 or D3 scoping the hint to `geoStatus === 'denied'` only. Optionally add a separate retry-prompt for `timeout` in a later plan or the same M2.
3. **F3** (LOW): Add a note that RTL locale hint text should match the fallback variant until human translation is reviewed.

Once F1 and F2 are addressed, the plan is ready for implementation. F3 can be addressed inline or deferred.

---

## Revision History

| Revision | Changes | Findings addressed | New findings | Status change |
|---|---|---|---|---|
| Initial | First review | — | F1, F2, F3 | OPEN |
| R1 | Separate keys committed in D4; denied-only scope via D7 + M2/M3 guard ACs; RTL TODO note in M1 + Risks | F1 ✅, F2 ✅, F3 ✅ | None | **APPROVED** |
