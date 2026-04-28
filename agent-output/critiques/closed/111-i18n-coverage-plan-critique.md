---
ID: 111
Origin: 111
UUID: d7e4a1b3
Status: Resolved
---

# Critique — Plan 111: Comprehensive i18n Coverage Remediation

| Field            | Value |
|------------------|-------|
| Artifact         | `agent-output/planning/111-i18n-coverage-plan.md` |
| Analysis         | `agent-output/analysis/closed/111-i18n-coverage-analysis.md` |
| Date             | 2026-04-28T10:24Z |
| Status           | APPROVED |
| Memory Mode      | NO-MEMORY MODE (Flowbaby unavailable) |

## Changelog

| Date | Handoff | Request | Summary |
|------|---------|---------|---------|
| 2026-04-28T10:24Z | Planner → Critic | "Plan is complete. Please review for clarity, completeness, and architectural alignment." | Initial critique |
| 2026-04-28T10:24Z | Critic → Planner | Verdict: APPROVED WITH MINOR REVISIONS (C-1, C-3 blocking) | Planner applied plan revisions addressing C-1 through C-5 |

---

## Value Statement Assessment

**Verdict: PASS**

> As a **multilingual UmmahFlow user** (Arabic, Turkish, Urdu, Pashto), I want **all UI text rendered in my chosen language**, so that **I can use the platform confidently without encountering raw translation keys, German-only strings, or English-only pages**.

- **Presence**: User story format with "As a / I want / So that" — present and complete.
- **Clarity**: "So that" outcome is verifiable via SC-1 through SC-4 (zero raw keys, zero ternaries, zero hardcoded strings, key parity).
- **Alignment**: Directly supports Master Product Objective ("first thought when any Muslim seeks a service") — a platform that shows raw translation keys to 4 of 6 supported locales undermines trust and discoverability.
- **Directness**: Value is delivered directly in this plan (not deferred). Only translation *quality* is deferred (D6 → Plan 107 DF-2), which is a separate concern.

---

## Overview

Plan 111 remediates ~245 i18n violations found by Analysis 111 across 9 finding categories (F1–F9). The plan organizes work into 7 milestones with clear dependencies (M1 foundation → M2–M5 parallel content → M6 verification → M7 release). Scope includes missing locale keys, legacy ternary migration, untranslated pages, hardcoded placeholders/toasts, and aria-label localization.

Classification as **Bugfix** is correct — these are broken strings for active users, not new features.

---

## Architectural Alignment

**Verdict: ALIGNED**

- **LanguageProvider pattern**: Plan correctly identifies the custom `LanguageProvider` (not next-intl) and directs all work through `t()` calls. M2 explicitly migrates away from the legacy `useLanguage` hook. This aligns with the established architecture.
- **TypeScript locale files**: Plan correctly notes locale files are `.ts` exports (not JSON), and includes `npm run type-check` as a gate. Consistent with codebase convention.
- **Postgres-first philosophy**: Not applicable — no database changes in scope. Correct.
- **Server/Client separation**: Not directly tested, but the plan doesn't introduce any patterns that would violate SSR/CSR boundaries. The `t()` function works in both contexts via the LanguageProvider.
- **Folder structure**: No new files/directories proposed outside of translation keys in existing locale files. Correct.
- **Absorbs Plan 061 row 27**: Good cross-referencing — admin i18n strings (originally tracked separately) are folded into M4/M5.

---

## Scope Assessment

**Verdict: APPROPRIATE — one concern noted**

The plan covers all 9 analysis findings (F1–F9) with traceable milestone mapping:
- F1 → M1, F2 → M2, F3 → M3, F4 → M5, F5 → M4, F6 → M4, F7 → M3, F8 → M1, F9 → N/A (confirmed examples, not actionable)

Deferred items are reasonable:
- D6 (translation quality) — correctly out of scope, owned by Plan 107 DF-2
- D7 (CI lint rule) — reasonable deferral to prevent scope creep; noted as follow-up

---

## Technical Debt Risks

- **Positive**: M2 eliminates the legacy `useLanguage` hook (reduces debt).
- **Positive**: M6 includes explicit hook deletion evaluation.
- **Neutral**: D7 deferral means new hardcoded strings can re-enter the codebase between this release and the CI lint rule follow-up. Acceptable risk for a bugfix.

---

## Findings

### C-1: Overlap Between M3 and M4 — File Scope Ambiguity

- **Severity**: MEDIUM
- **Status**: ADDRESSED — M3 now carries explicit ownership note (complete remediation of listed files, including placeholders/toasts); M4 carries explicit exclusion note and Analysis F5/F6 cross-reference
- **Location**: M3 scope vs M4 scope
- **Description**: `SignupPageContent.tsx` appears in both M3 (hardcoded German titles) and M4 (hardcoded placeholders). Similarly, `create-quick/review/page.tsx` is listed in M3 (untranslated page) but also has ~10 placeholders and ~4 toasts that logically belong to M4. The plan doesn't clarify which milestone owns the *complete* i18n remediation of these shared files.
- **Impact**: Implementer may do partial work in M3, then re-visit the same file in M4, or miss strings assuming the other milestone handles them. Risk of duplication or gaps at file boundaries.
- **Recommendation**: Add a note in M3 or M4 clarifying ownership: either M3 handles *all* strings in listed pages (including placeholders/toasts), or M3 handles only visible JSX text and M4 picks up placeholders/toasts in those same files. The Planner should state the boundary explicitly.

### C-2: SC-3 Scope Qualifier "files touched by this plan" Is Ambiguous

- **Severity**: LOW
- **Status**: ADDRESSED — SC-3 reworded to reference all `src/` files listed in milestones and explicitly notes M6 grep as the authoritative gate
- **Location**: Success Criteria SC-3
- **Description**: SC-3 says "Zero hardcoded user-visible text... across all files touched by this plan." The phrase "files touched by this plan" is ambiguous — does it mean files explicitly listed in milestones, or any file the Implementer edits? If the Implementer discovers additional hardcoded strings in an adjacent file while working, the SC doesn't clarify whether those are in scope.
- **Impact**: Minor — M6 verification grep is more comprehensive and acts as the true gate. SC-3 language is just imprecise.
- **Recommendation**: Tighten SC-3 to "across all `.tsx` files under `src/`" (matching M6 grep scope), or leave as-is and note that M6 is the authoritative verification gate.

### C-3: Missing Key-Diff Script Definition

- **Severity**: MEDIUM
- **Status**: ADDRESSED — M6 scope now defines `scripts/check-i18n.mjs` as a permanent committed deliverable; M1 acceptance criteria references the definition in M6
- **Location**: M1 Acceptance Criteria, SC-1, SC-4, M6
- **Description**: The plan references a "key-diff script" in 4 places (M1 AC, SC-1, SC-4, M6) but does not define it. Analysis 111 mentions a temporary `check-i18n.mjs` script that was "created and cleaned up" during analysis. Is the Implementer expected to recreate this? Is it a new deliverable? Or can the Implementer use an ad-hoc approach?
- **Impact**: Implementer may waste time recreating or inventing the script. If there's no standard approach, verification quality varies.
- **Recommendation**: Add a brief note in M1 or M6 that the Implementer should create a reusable key-diff utility (e.g., a script in `scripts/`) or document the expected approach. This is not prescriptive *code* — it's a verification tool definition.

### C-4: No Explicit Handling of Analysis Remaining Gap #1 (F8 "Unknown" Fallbacks)

- **Severity**: LOW
- **Status**: ADDRESSED — Assumption #4 updated: the ~9 "Unknown" F8 keys are now flagged as requiring Implementer callsite verification at the start of M1 before keys are added; M1 scope carries a corresponding sub-task note
- **Location**: M1 scope, Analysis Remaining Gap #1
- **Description**: Analysis F8 lists ~15 keys missing from all locales. 6 of those have confirmed inline `||` fallbacks, but the Analysis explicitly marks ~9 as "Unknown" fallback status (e.g., `create.basics.descriptionLabel`, `create.location.validationError`, etc.). The plan's Assumption #4 states all F8 keys "have inline `||` fallbacks — confirmed by Planner trace." However, the Analysis shows 9 keys marked "Unknown" in the Has In-Code Fallback column.
- **Impact**: If Assumption #4 is wrong for any key, those keys render as raw dot-notation strings on screen for *all* locales (not just ar/tr/ur/ps). This would be a regression missed by the plan.
- **Recommendation**: Either confirm the Planner trace result is documented (e.g., "Planner confirmed all 15 F8 keys have fallbacks — see conversation transcript") or add a sub-task in M1 to verify each F8 key's callsite before adding keys.

### C-5: M4/M5 File Lists Are "Non-Exhaustive" — No Completeness Guarantee

- **Severity**: LOW
- **Status**: ADDRESSED — M4 now references Analysis F5 (placeholders) and F6 (toasts); M5 now references Analysis F4 (aria-labels) for exhaustive file and line inventory
- **Location**: M4 Files touched, M5 Files touched
- **Description**: M4 and M5 both note their file lists are "non-exhaustive." While M6's grep-based verification acts as a safety net, the Implementer has no definitive checklist for M4/M5 completion.
- **Impact**: Low — Analysis F4/F5/F6 provide the exhaustive lists. The Implementer can cross-reference those.
- **Recommendation**: Add a note in M4/M5: "Refer to Analysis 111 findings F4, F5, F6 for the exhaustive file and line inventory."

### C-6: Process Note — `.github/chatmodes/planner.chatmode.md` Not Found

- **Severity**: LOW
- **Status**: OPEN
- **Location**: Process
- **Description**: Per Critic instructions, the planner chatmode file should be read at review start. File search returned no results for `.github/chatmodes/planner.chatmode.md`.
- **Impact**: None on plan quality. Process note only.
- **Recommendation**: No action required on this plan. Planner chatmode file may have been relocated or not yet created.

---

## Unresolved Open Questions

**None.** The plan has no `OPEN QUESTION` markers. All three analysis open questions were resolved as decisions D2/D3/D4.

## Decision Record Check

- **D1–D6**: All marked `[RESOLVED]` with rationale. Pass.
- **D7**: Marked `[DEFERRED: Planner — follow-up plan after this ships]`. Has downstream owner (Planner), target artifact (follow-up plan), and trigger (after this ships). Meets Deferred Findings Rule. Pass.

## Duration Estimates Check

**Present.** Duration Estimates section includes phase-level estimates with uncertainty ratings and a key uncertainty note about total new key count. Pass.

---

## Risk Assessment

The plan's risk table is adequate. One additional risk worth noting:

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| M3/M4 file overlap (C-1) causes strings missed at milestone boundary | Medium | Moderate — partial fix shipped | Planner clarifies ownership in revision |

---

## Recommendations

1. **Address C-1** (MEDIUM): Clarify M3/M4 file ownership boundary — which milestone owns the *complete* i18n of shared files like `SignupPageContent.tsx` and `create-quick/review/page.tsx`.
2. **Address C-3** (MEDIUM): Add a note about the key-diff script expectation — whether the Implementer should create a reusable script or use ad-hoc verification.
3. **Address C-4** (LOW): Either confirm the F8 "Unknown" fallback investigation result or add a verification sub-task in M1.
4. **Address C-5** (LOW): Add analysis cross-reference notes to M4/M5 for exhaustive file lists.
5. C-2 and C-6 are informational — no revision needed.

---

## Verdict

**APPROVED WITH MINOR REVISIONS**

The plan is well-structured, clearly scoped, and architecturally aligned. The value statement is strong and directly measurable. All analysis findings are mapped to milestones. Dependencies are correctly sequenced. Duration estimates are present. The deferred items (D6, D7) are reasonable.

Two MEDIUM findings (C-1, C-3) should be addressed before implementation begins to prevent milestone boundary confusion and verification ambiguity. These are clarification-level revisions, not structural changes.

**Gate**: All blocking findings (C-1, C-3) addressed. Remaining findings (C-2, C-4, C-5) also addressed. Implementer may proceed.

---

## Revision History

| Revision | Date | Artifact Changes | Findings Addressed | New Findings | Status Changes |
|----------|------|-----------------|-------------------|--------------|----------------|
| Initial  | 2026-04-28T10:24Z | N/A — first review | N/A | C-1 through C-6 opened | — |
| Rev 1    | 2026-04-28T10:24Z | M3 ownership note; M4 exclusion + Analysis F5/F6 cross-ref; M5 Analysis F4 cross-ref; M6 key-diff script definition; Assumption #4 F8 verification gate; SC-3 wording tightened; plan changelog updated | C-1 ADDRESSED, C-2 ADDRESSED, C-3 ADDRESSED, C-4 ADDRESSED, C-5 ADDRESSED | — | Verdict: APPROVED |
