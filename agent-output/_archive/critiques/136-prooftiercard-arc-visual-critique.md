---
ID: 136
Origin: 136
UUID: 7f4b2c91
Status: OPEN
---

# Critique: Plan 136 — ProofTierCard Arc Visual Upgrade

| Field        | Value                                                        |
| ------------ | ------------------------------------------------------------ |
| Artifact     | `agent-output/planning/136-prooftiercard-arc-visual-plan.md` |
| Date         | 2026-06-01T21:45Z                                            |
| Status       | Initial                                                      |
| GitHub Issue | https://github.com/abu-lina/uflow/issues/239                 |

### Changelog

| Timestamp         | Handoff          | Request                                                        | Summary                                                                            |
| ----------------- | ---------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 2026-06-01T21:45Z | Planner → Critic | Review plan for clarity, completeness, architectural alignment | Initial critique created                                                           |
| 2026-06-01T21:55Z | Planner → Critic | Plan revised per F1/F2/F3                                      | F1 palette darkened + stroke added; F2 RTL direction note added; F3 path corrected |

---

## Value Statement Assessment

**Verdict: PASS**

The value statement follows correct user story format: "As a provider detail viewer, I want to see a visually intuitive arc/gauge indicator … so that I can instantly understand the trust depth without parsing a grid of identical shield icons."

- The "so that" outcome is verifiable (visual comprehension improvement).
- Aligns with the Provider Detail UX — Trust & Transparency epic.
- Value is delivered directly — not deferred.
- Rationale for replacing the shield grid is clear and well-motivated (visual flatness, glanceability).

---

## Overview

Well-scoped, tightly bounded plan targeting a single visual replacement in `ProofTierCard.tsx`. No schema, service, API, or behavioural changes. Five milestones with clear acceptance criteria. All 7 decisions are RESOLVED. No OPEN QUESTION items. Duration estimates are present with uncertainty drivers.

Classification as "Abbreviated" pipeline is correct — this is a cosmetic upgrade within a single client component.

---

## Architectural Alignment

**Verdict: ALIGNED**

- Single component change within `src/features/providers/components/` — correct placement per the project's feature-module convention.
- No new dependencies, no new files (private sub-component inside existing file).
- Props API frozen — maintains the contract established by Plan 135.
- `computeVerificationLevel()` logic untouched — separation of data logic from visual rendering is clean.
- SVG approach (inline, no canvas/external lib) is SSR-compatible with Next.js App Router client components.
- Release strategy bundles correctly with Plans 133+134+135 on the same branch.

---

## Scope Assessment

**Verdict: APPROPRIATE**

In Scope / Out of Scope boundaries are crisp. The exclusion list is explicit and covers all adjacent concerns (logic, props, services, other components, animation). The inclusion of debug-page verification shows thoroughness.

One note: the debug page is at `src/app/(debug)/proof-tier-example/page.tsx`, not `(public)` as referenced in M3 task 5 — see Finding F3 below. The page uses `<ProofTierCard>` as a black box, so no code changes are needed there.

---

## Technical Debt Risks

**Verdict: LOW**

- The private `VerificationArc` sub-component is correctly scoped to prevent premature abstraction. D7's "extraction is trivial if reuse emerges" is sound.
- Removing the `Shield` import cleanly eliminates a dead dependency.
- No new test infrastructure needed — React Testing Library can query SVG elements natively.

---

## Findings

### F1 — Lightest active segment contrast vs inactive segment (MEDIUM)

| Field    | Detail                                                                                       |
| -------- | -------------------------------------------------------------------------------------------- |
| Severity | MEDIUM                                                                                       |
| Status   | RESOLVED                                                                                     |
| Issue    | Active segment at level 1 (#C5E4DF) may be indistinguishable from inactive segment (#E5E7EB) |

**Description**: M2 verifies contrast of the darkest teal (#1D5C57) against the card background (#F8FBF9), which is correct. However, the critical contrast boundary is between the _lightest active fill_ (#C5E4DF ≈ rgb(197, 228, 223)) and the _inactive fill_ (#E5E7EB ≈ rgb(229, 231, 235)). These are both light values with an estimated contrast ratio of ~1.1:1 — far below the WCAG 1.4.11 "non-text contrast" requirement of 3:1 for graphical objects.

At level 1, only one segment is active and the remaining three are inactive. If a user cannot distinguish active from inactive at the lightest shade, the arc communicates no level information visually.

**Impact**: Accessibility violation (WCAG 1.4.11); level 1 providers could appear as "no level" to users with mild colour vision deficiency.

**Recommendation**: ~~Either (a) darken the level-1 active fill to ensure ≥3:1 contrast against #E5E7EB (approximately #78B8AD or darker), or (b) add a stroke/border to active segments as a secondary cue.~~ **RESOLVED**: Planner revised palette — level-1 darkened to #6AB3A8, level-2 to #4A9E92, and added 1px #2B6D66 stroke on active segments. M2 acceptance criteria now require adjacent active-vs-inactive contrast verification.

---

### F2 — SVG `<text>` rendering for RTL scripts not addressed (LOW)

| Field    | Detail                                                                |
| -------- | --------------------------------------------------------------------- |
| Severity | LOW                                                                   |
| Status   | RESOLVED                                                              |
| Issue    | SVG `<text>` elements do not inherit CSS `direction` from parent HTML |

**Description**: Assumption #4 states "RTL locale rendering is handled by the existing card layout (the arc itself is symmetrical and locale-neutral)." The arc shape is indeed symmetrical, but the centre `<text>` element inside the SVG renders RTL scripts (Arabic, Urdu, Pashto) differently from HTML text. SVG `<text>` does not inherit CSS `direction: rtl`; it requires the `direction` attribute or `writing-mode` to be set explicitly on the element.

With `text-anchor: middle`, short labels should centre correctly. However, longer RTL level labels may render with incorrect glyph ordering inside the SVG if `direction="rtl"` is not set.

**Impact**: Level labels could appear garbled for 3 of the 6 supported locales (ar, ur, ps) if the labels exceed a few characters. Currently the labels are short single-word strings, so practical risk is low.

**Recommendation**: ~~Add a note to M2 or M3 acceptance criteria that the Implementer should set `direction="rtl"` on the `<text>` element when the active locale is RTL, or verify that `text-anchor: middle` produces correct rendering for all 6 locale label strings.~~ **RESOLVED**: Plan Assumption #4 now explicitly requires `direction="rtl"` on SVG `<text>` for RTL locales. M2 adds requirement #7 and acceptance criteria for RTL text direction verification.

---

### F3 — Debug page path reference incorrect (LOW)

| Field    | Detail                                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Severity | LOW                                                                                                                          |
| Status   | RESOLVED                                                                                                                     |
| Issue    | Plan references `src/app/(public)/proof-tier-example/page.tsx`; actual path is `src/app/(debug)/proof-tier-example/page.tsx` |

**Description**: M3 task 5 says "Check `src/app/(public)/proof-tier-example/page.tsx`". The file is actually at `src/app/(debug)/proof-tier-example/page.tsx`. The page renders `<ProofTierCard>` as a black box (verified), so no code changes are needed there — but the incorrect path could confuse the Implementer.

**Impact**: Minor — Implementer may spend a few minutes searching for the wrong path.

**Recommendation**: ~~Correct the path reference in M3 task 5.~~ **RESOLVED**: Path corrected to `src/app/(debug)/proof-tier-example/page.tsx` in M3 task 5.

---

### F4 — `.github/chatmodes/planner.chatmode.md` missing (LOW — Process)

| Field    | Detail                                                |
| -------- | ----------------------------------------------------- |
| Severity | LOW                                                   |
| Status   | OPEN                                                  |
| Issue    | Planner chatmode file does not exist in this worktree |

**Description**: Critic instructions require checking for `.github/chatmodes/planner.chatmode.md` at review start. The file does not exist. This is a process note for completeness — it does not affect plan quality.

**Impact**: None for this review.

**Recommendation**: No action required for this plan.

---

## Unresolved Open Questions

None. The plan contains no `OPEN QUESTION` items.

---

## Decision Record Check

All 7 decisions (D1–D7) are marked `[RESOLVED]`. No `[OPEN]` or `[DEFERRED]` decisions.

---

## Duration Estimates Check

Present and reasonable. Total ~2–3 hours for a visual-only single-component change is credible. Uncertainty drivers documented per milestone.

---

## Hotfix Risk Assessment

**"How will this plan result in a hotfix after deployment?"**

- **Low overall risk**: This is a visual-only change. No data, API, schema, or logic changes.
- **Worst case**: SVG renders incorrectly → cosmetically broken card, but factual content ("What we verified" checklist) remains intact and accessible.
- **Edge case 1**: SVG overflow on devices < 350px — mitigated by Risks table (test at 320px).
- **Edge case 2**: RTL text rendering in SVG — see Finding F2. Practical risk is low for short labels.
- **Edge case 3**: Contrast failure at level 1 — see Finding F1. Could degrade trust communication for level-1 providers.

No hotfix-triggering scenarios identified. All risks are cosmetic and can be fixed in a follow-up patch.

---

## Risk Assessment

| Category            | Rating  | Notes                                                     |
| ------------------- | ------- | --------------------------------------------------------- |
| Scope creep         | Low     | Tight in/out scope boundary                               |
| Architectural drift | None    | Single-component visual change                            |
| Technical debt      | Low     | Clean removal of Shield dependency                        |
| Deployment risk     | None    | No schema/API changes                                     |
| Accessibility       | **Low** | F1 contrast issue resolved with darkened palette + stroke |

---

## Recommendations

1. **Address F1 before implementation** (MEDIUM): The contrast issue between lightest active and inactive segments is a real accessibility gap. Planner should either adjust the colour palette or specify an alternative visual differentiator (stroke, border, opacity change).
2. **Note F2 in M2 or M3** (LOW): A one-line acknowledgement that SVG `<text>` needs explicit `direction` for RTL locales would prevent a subtle bug.
3. **Fix F3 path reference** (LOW): Quick correction — `(public)` → `(debug)`.
4. **F4 is informational** — no action needed.

---

## Verdict

**APPROVED**: All findings resolved. F1 (MEDIUM) addressed with darkened palette and active stroke. F2 and F3 (LOW) corrected in plan text. Plan is clear, complete, and architecturally aligned. Ready for Implementer.
