---
ID: 103
Origin: 103
UUID: a3f5c9d1
Status: Resolved
---

# Critique 103 — WerAudienceFilter Component Plan

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| Artifact          | [agent-output/planning/103-wer-audience-filter-plan.md](../planning/103-wer-audience-filter-plan.md) |
| Analysis          | None (Analyst skipped — no unknowns)                               |
| Review Date       | 2026-04-25T17:55Z (initial) / 2026-04-25T18:05Z (Revision 1)     |
| Reviewed By       | Critic                                                             |
| Status            | CLOSED — **APPROVED**                                              |
| Verdict           | APPROVED (Revision 1)                                              |
| GitHub Issue      | https://github.com/abu-lina/uflow/issues/164                      |

## Changelog

| Date                | Handoff    | Request                           | Summary                         |
| ------------------- | ---------- | --------------------------------- | ------------------------------- |
| 2026-04-25T17:55Z   | Planner → Critic | Initial critique of Plan 103 v1  | First review — REVISION REQUESTED |
| 2026-04-25T18:00Z   | Planner    | Addressed F1–F5                  | Revision 1 submitted for re-review |
| 2026-04-25T18:05Z   | Critic     | Revision 1 re-review             | **APPROVED** — all blocking and recommended findings resolved |

---

## Process Note

`PROCESS`: `.github/chatmodes/planner.chatmode.md` does not exist in this worktree. This is a LOW process gap. The chatmode template helps ensure planner outputs follow consistent conventions. Not a blocker for this review; recommend creating the file to support future Planner sessions.

---

## Value Statement Assessment ← MUST START HERE

> **As a search user on UFlow**, I want to filter service providers by target audience (Männer, Frauen, Kinder) so that I can find services that are relevant for specific members of my household or community in a single search interaction.

| Check       | Assessment |
| ----------- | ---------- |
| Presence    | ✅ Clear user story format |
| Clarity     | ✅ "So that" outcome is observable: relevant results by audience type |
| Alignment   | ✅ Directly supports UFlow's community-first search UX vision; removes a visible placeholder UI |
| Directness  | ⚠️ Value is partially deferred — UI ships but counts are not wired to search results (Decision 2). Acknowledged in scope, not value drift. **Acceptable** with the explicit note that a follow-up plan delivers the connected value. |

**Value statement verdict:** Sound. The user story is appropriately scoped to the UI phase. The deferred wiring is explicitly documented. No drift from the Master Product Objective.

---

## Overview

Plan 103 is well-structured, thoroughly scoped, and directly references verified Figma design context (node 234:11451, confirmed). The component architecture mirrors established patterns (`WoCityResults.tsx`), the TDD sequence is explicit, and 8 acceptance criteria cover the core observable behaviours. The decision record is complete with 8 resolved items. No open questions remain.

The plan has **one MEDIUM finding** (F1) that requires a concrete downstream tracking reference before implementation proceeds, and **six LOW findings** (F2–F7) that are informational for the implementer and should be acknowledged before handoff.

---

## Architectural Alignment

| Dimension | Assessment |
| --------- | ---------- |
| Client/Server boundary | ✅ `'use client'` — correct; pure UI state, no server data |
| Folder placement | ✅ `src/features/search/components/` — correct domain placement per copilot-instructions |
| `t` prop injection | ✅ Consistent with `WasMealResults`, `WoCityResults` — no direct `useLanguage()` in feature component |
| State scope | ✅ Local `useState` — appropriate for UI-only phase |
| No DB changes | ✅ Static audience types confirmed |
| No new `src/types/` changes | ✅ Confirmed, Decision 7 |
| `AudienceRow` co-location | ✅ Mirrors `CityRow` in `WoCityResults.tsx` — YAGNI-safe |
| AUDIENCES constant pattern | ✅ Open/Closed-friendly; clean extension point |

---

## Scope Assessment

| Area | Assessment |
| ---- | ---------- |
| In-scope clarity | ✅ 5 discrete items well-defined |
| Out-of-scope clarity | ⚠️ "Clearing audience counts when 'Alles löschen' is pressed" is listed but lacks downstream artifact reference — see F1 |
| Manifest completeness | ✅ 7 file changes listed; codebase verification confirms no additional files required |
| Search context exclusion | ✅ Explicitly scoped out; Decision 2 resolved |
| "Filter" accordion exclusion | ✅ Separate plan, correctly excluded |

---

## AC Completeness Assessment

The 10 ACs are well-targeted for this phase. Coverage assessment:

| AC | Assessment |
|----|------------|
| AC-1: Accordion shows three rows | ✅ Visual + e2e; backed by existing `ExpandSection.test.tsx` |
| AC-2: Row visual anatomy | ✅ Good — covers icon bg colour, label, subtitle, stepper presence |
| AC-3: Increment behaviour | ✅ P0 covered in test strategy |
| AC-4: Decrement at count > 0 | ✅ P0 covered |
| AC-5: Decrement at count 0 (no-op) | ✅ P0 covered |
| AC-6: Counter independence | ✅ P1 — important regression guard |
| AC-7: Translation key resolution | ✅ Via `t` stub pattern |
| AC-8: Accessibility aria-labels | ✅ Interpolation pattern confirmed via `{{city}}` precedent |
| AC-9: type-check | ✅ CI gate |
| AC-10: vitest | ✅ CI gate |

**Gap**: No AC explicitly verifies `<img alt="">` on icon images (decorative empty alt for accessibility). AC-8 covers stepper aria-labels but not the icon accessibility pattern. This is LOW severity — M3 guidance specifies it, but no test or AC enforces it. The implementer should note this in the implementation doc.

---

## Test Strategy Assessment

- 8 unit test cases — **adequate** for a pure-UI stateful component
- TDD sequence explicitly ordered (RED → GREEN → REFACTOR) ✅
- Test double pattern (inline `t` stub) consistent with project convention ✅
- Zero network/router mocks needed — clean isolation ✅
- No integration or e2e tests added — appropriate; accordion is covered by `ExpandSection.test.tsx` ✅

**Gap identified (F8)**: `count` display container specified as `w-[12px]`. The test strategy does not include a case for multi-digit counts (e.g., count=10 or 12) which would overflow the fixed-width container visually. Not a test requirement but the implementer should verify the display at double-digit values.

---

## Technical Debt Risks

| Risk | Severity | Notes |
| ---- | -------- | ----- |
| Wer counts survive "Alles löschen" | Medium | Users see cleared WAS/WO but non-zero Wer counts — cosmetic inconsistency. Functionally safe (search button stays disabled without selectedWas) but misleading. Needs open-action tracking. |
| Non-ASCII translation key names | Low | `männerLabel` introduces ä in key name; technical valid (quoted string) but breaks ASCII camelCase convention of all ~40 existing keys in `suchen.*` block |
| Non-ASCII icon filename | Low | `männer.svg` in `public/icons/audience/` — potential URL encoding edge case on nginx/Hetzner for static assets |
| Stepper count display at double digits | Low | `w-[12px]` clips counts ≥ 10; visual only, no data loss |

---

## Findings

### F1 — MEDIUM | "Alles löschen" gap lacks downstream tracking artifact

| Field | Value |
| ----- | ----- |
| **Status** | OPEN |
| **Severity** | MEDIUM |
| **Issue Title** | "Alles löschen" resets WAS/WO but not Wer counters — no downstream tracking artifact |
| **Description** | The plan's Out of Scope section states "Clearing audience counts when 'Alles löschen' is pressed (follow-up — requires state hoisting)" but provides no downstream owner, target artifact, or trigger. Verification confirms the `clearAll` handler in `search/page.tsx` (lines 551–563) resets `wasQuery`, `wasResults`, `selectedWoCity`, etc. — but Wer counters are local to `WerAudienceFilter` and **will not be reset**. After this plan ships, pressing "Alles löschen" will leave Wer steppers at non-zero values while WAS/WO appear empty. Functionally safe (search button requires `selectedWas` and steppers are not wired) but visually inconsistent. |
| **Impact** | User-visible cosmetic defect from day 1 of release. No search data integrity issue. Risk that debt is silently dropped with no tracking reference. |
| **Recommendation** | Add an explicit reference to an open-actions file in the Out of Scope statement, e.g.: `→ tracked in agent-output/planning/open-actions.md as "Wer counter reset via clearAll"`. Alternatively, Planner can add a row to `agent-output/planning/open-actions.md` directly. The tracking entry must exist before implementation proceeds so the Implementer can reference it. |

---

### F2 — LOW | Translation key names use non-ASCII character (`männerLabel`)

| Field | Value |
| ----- | ----- |
| **Status** | OPEN |
| **Severity** | LOW |
| **Issue Title** | `männerLabel` breaks ASCII camelCase convention of all existing `suchen.*` keys |
| **Description** | All ~40 existing `suchen.*` translation keys use ASCII camelCase key names (e.g. `searchPlaceholder`, `providerCount`, `removeSelection`, `selectionLabel`). The plan introduces `männerLabel` with `ä` (U+00E4). While valid as a quoted TypeScript object key and unlikely to cause technical failures, it deviates from established project naming convention. Tooling edge cases (grep, code search, ESLint rules that scan strings) are non-zero risk. |
| **Impact** | Low technical risk; convention inconsistency. |
| **Recommendation** | Use ASCII equivalents: `maennerLabel` (standard German ASCII transliteration) or English-semantic keys such as `menLabel` / `womenLabel` / `childrenLabel`. The choice should match the project's broader key language preference — but ASCII is strongly preferred given all existing precedent. Planner to confirm preferred form and update the Translation Keys section. |

---

### F3 — LOW | Non-ASCII filename `männer.svg` in static assets

| Field | Value |
| ----- | ----- |
| **Status** | OPEN |
| **Severity** | LOW |
| **Issue Title** | Icon filename `männer.svg` contains non-ASCII character — potential static serving edge case |
| **Description** | The file change manifest specifies `public/icons/audience/männer.svg`. Nginx on Hetzner and Next.js static file serving generally handle UTF-8 filenames, but there is a real risk of URL encoding issues in environments where the web request uses percent-encoded paths (`m%C3%A4nner.svg`) but the filesystem expects `männer.svg`. The `<img src="/icons/audience/männer.svg">` path could result in a 404 depending on nginx configuration. |
| **Impact** | Potential broken icon image in production (männer row only). |
| **Recommendation** | Use ASCII filename: `maenner.svg` (consistent with F2 convention fix) or `men.svg`. Update the File Change Manifest and Icon Assets table accordingly. |

---

### F4 — LOW | Figma MCP asset fetch workflow unclear for implementer

| Field | Value |
| ----- | ----- |
| **Status** | OPEN |
| **Severity** | LOW |
| **Issue Title** | Plan lists asset UUIDs but not fetch workflow; direct URL construction may not work outside MCP context |
| **Description** | The Icon Assets table provides Figma asset UUIDs (e.g. `34883bfc-...`) and target paths. The plan says "fetch these via the Figma API URLs in the design context response". However, the Figma MCP asset URLs (`https://www.figma.com/api/mcp/asset/<uuid>`) are session-specific and may require MCP authentication to fetch — they are not standard public Figma URLs. The implementer cannot simply `curl` them without the MCP context. |
| **Impact** | Implementer confusion; potential M2 failure if not using MCP tool to re-fetch assets. |
| **Recommendation** | Add explicit M2 instruction: "Use the Figma MCP tool (`get_design_context` with `fileKey: mH4p6c8GExOuLn65WdSPMb` and `nodeId: 234:11451`) to re-fetch the design context and download the vectorized icon images as SVG/PNG files. If the Figma MCP is unavailable, use the Lucide fallback (`User`, `User`, `Baby` icons) and note in the commit message." |

---

### F5 — LOW | Stepper button background token left unresolved

| Field | Value |
| ----- | ----- |
| **Status** | OPEN |
| **Severity** | LOW |
| **Issue Title** | `bg-neutral-muted` vs `bg-[#e9e9e9]` for stepper button background is a pending decision |
| **Description** | The Figma Design Tokens table states `bg-[#e9e9e9] or check if bg-neutral-muted maps to this value`. Codebase verification shows `bg-neutral-muted` is in the Tailwind safelist but its CSS variable (`--color-neutral-muted`) resolves through an HSL variable — the hex value is not confirmed as `#e9e9e9`. The plan leaves this as an open check rather than a resolved decision. |
| **Impact** | Implementer may use wrong background, causing visual drift from Figma. Low impact but fixable before implementation starts. |
| **Recommendation** | Resolve now: check `globals.css` for `--color-neutral-muted` value. If it does not resolve to `#e9e9e9` or close equivalent, use `bg-[#e9e9e9]` as the firm value. Add the resolved value to the Design Tokens table. |

---

### F6 — LOW | ILLUSTRATIVE code in plan — borderline WHAT/WHY constraint

| Field | Value |
| ----- | ----- |
| **Status** | OPEN |
| **Severity** | LOW |
| **Issue Title** | Plan includes pseudo-code blocks labeled ILLUSTRATIVE ONLY |
| **Description** | The AUDIENCES constant block and M4 replacement JSX are clearly labeled "ILLUSTRATIVE ONLY — implementer may adjust." These provide useful structural guidance and are not prescriptive. They sit at the boundary of the WHAT/WHY constraint for Planner docs. |
| **Impact** | Minimal — the labels make intent clear. No design or correctness risk. |
| **Recommendation** | No change required. Labels are sufficient. Noting for completeness. |

---

### F7 — PROCESS | `planner.chatmode.md` missing

| Field | Value |
| ----- | ----- |
| **Status** | OPEN |
| **Severity** | PROCESS |
| **Issue Title** | `.github/chatmodes/planner.chatmode.md` does not exist |
| **Description** | The Critic mode instructions require checking for `.github/chatmodes/planner.chatmode.md` at review start. The file does not exist in this worktree. |
| **Impact** | No impact on this plan review. Future Planner sessions may produce less consistent outputs. |
| **Recommendation** | Create `.github/chatmodes/planner.chatmode.md` in a follow-up housekeeping task. |

---

### F8 — LOW | Count display `w-[12px]` will clip double-digit values

| Field | Value |
| ----- | ----- |
| **Status** | OPEN |
| **Severity** | LOW |
| **Issue Title** | Stepper count display fixed at 12px — overflows at counts ≥ 10 |
| **Description** | The component structure spec and Figma both show `w-[12px]` for the count display element. A count of 10 or above produces a two-character string that exceeds 12px at `text-base` (16px font), causing visible clipping or overflow. The test strategy does not include a case for multi-digit counts. |
| **Impact** | Cosmetic visual defect at edge values (count ≥ 10). Given the stepper has no max and starts at 0, a user tapping `+` 10 times will see a clipped display. Low probability but a production-reproducible bug. |
| **Recommendation** | Implementer should use `min-w-[12px]` or `min-w-3` instead of `w-[12px]` so the container expands for larger values. Add a test case: "count display renders '10' without truncation after 10 increments". |

---

## Hotfix Risk Assessment

> "How will this plan result in a hotfix after deployment?"

| Scenario | Probability | Severity | Mitigation |
| -------- | ----------- | -------- | ---------- |
| `männer.svg` 404 in production due to non-ASCII URL encoding | Low-Medium | Medium | See F3 — use ASCII filename |
| Figma asset expiry before implementation starts | Low (deadline 2026-05-02) | Medium | M2 explicitly addresses; Lucide fallback documented |
| `bg-neutral-muted` wrong colour value deployed | Low | Low | See F5 — resolve token before implementation |
| Users report "Alles löschen" doesn't clear audience counts | Certain (by design) | Low-Medium | Cosmetic; no search data issue. Document as known limitation in release notes. |

The single most actionable hotfix risk is F3 (non-ASCII filename → potential 404). This can be fully eliminated before implementation starts.

---

## Recommendations

**Before implementation starts (required):**

1. **F1 (MEDIUM)** — Add an open-action entry tracking "Wer counter reset via clearAll" in `agent-output/planning/open-actions.md` (or the appropriate open-actions file for this release). Reference it in the Plan 103 Out of Scope section.
2. **F2 (LOW)** — Resolve `männerLabel` key name: confirm ASCII convention (`maennerLabel` or English semantic) and update Translation Keys section.
3. **F3 (LOW)** — Change icon filenames to ASCII (e.g. `maenner.svg`, `frauen.svg`, `kinder.svg`) in the File Change Manifest and Icon Assets table.
4. **F4 (LOW)** — Add explicit Figma MCP re-fetch instruction to M2.
5. **F5 (LOW)** — Resolve `bg-neutral-muted` vs `bg-[#e9e9e9]` in Design Tokens table.

**Implementer notes (not blocking plan approval):**

- **F8**: Use `min-w-[12px]` for count display container; add double-digit test case.
- **F6**: ILLUSTRATIVE blocks — no action needed.
- **AC gap**: Add `alt=""` on icon `<img>` tags; note in implementation doc.

---

## Questions for Planner

1. **F2**: Should `suchen.wer.*` key names use ASCII (`maennerLabel`) or English semantics (`menLabel`, `womenLabel`, `childrenLabel`)? The project uses German locale but all existing key names are English-semantic ASCII.
2. **F1**: Is `agent-output/planning/open-actions.md` the correct artifact to track the "Alles löschen" reset gap, or should a new plan-specific open-actions file be created (e.g. `103-open-actions.md`)?
3. **F5**: Can you confirm the resolved hex value of `--color-neutral-muted` in `globals.css` so the Design Tokens table can be updated with a firm decision?

---

## Risk Assessment Summary

| Risk Level | Count | Items |
| ---------- | ----- | ----- |
| CRITICAL | 0 | — |
| HIGH | 0 | — |
| MEDIUM | 1 | F1 — "Alles löschen" gap lacks downstream tracking |
| LOW | 6 | F2 (key naming), F3 (filename), F4 (MCP workflow), F5 (token), F6 (illustrative), F8 (count width) |
| PROCESS | 1 | F7 (chatmode missing) |

---

## Revision History

| Version | Date                | Changes | Status |
| ------- | ------------------- | ------- | ------ |
| Initial | 2026-04-25T17:55Z   | First review of Plan 103 v1 | OPEN — REVISION REQUESTED |
| Revision 1 | 2026-04-25T18:05Z | Planner addressed F1–F5; Critic re-review | **APPROVED** |

---

## Revision 1 — Critic Re-review (2026-04-25T18:05Z)

### F1 (MEDIUM — was BLOCKING): ✅ RESOLVED

Open-action entry added to `agent-output/planning/open-actions.md` with title "Wer Counter Reset via 'Alles löschen' (Plan 103)", including source, priority, trigger, context, and 5-step resolution path. Plan 103 Out of Scope section updated to reference it explicitly: `tracked in agent-output/planning/open-actions.md → "Wer counter reset via clearAll (Plan 103)"`. Verified present at plan line 82.

### F2 (LOW): ✅ RESOLVED

`männerLabel` → `maennerLabel` applied consistently across all 9 occurrences: AC-7, AudienceRow props table, AUDIENCES constant, Icon Assets table, Translation Keys block, Translation Keys table, File Change Manifest, In Scope bullet, and internal state type. Zero remaining non-ASCII key name references confirmed via grep.

### F3 (LOW): ✅ RESOLVED

`männer.svg` → `maenner.svg` applied in Icon Assets table, File Change Manifest, AUDIENCES constant, In Scope bullet, and M2 task step. Zero remaining non-ASCII filenames confirmed via grep.

### F4 (LOW): ✅ RESOLVED

M2 now includes explicit Figma MCP re-fetch instruction: "Use the Figma MCP tool — call `get_design_context` with `fileKey: mH4p6c8GExOuLn65WdSPMb` and `nodeId: 234:11451`" with explicit note that direct `curl` is not possible outside MCP session context.

### F5 (LOW): ✅ RESOLVED

Design Tokens table updated with verified value: `bg-neutral-muted` resolves to `hsl(0 0% 96%)` (`#f5f5f5`, neutral-50) — **not** `#e9e9e9`. Firm recommendation is `bg-[#e9e9e9]` or `bg-neutral-100` (`hsl(0 0% 91%)` ≈ `#e8e8e8`). Decision is now explicit in the plan.

### F6 (LOW): ✅ No change required (labels sufficient)

### F7 (PROCESS): ℹ️ Logged, not blocking. No change to plan.

### F8 (LOW): ℹ️ Implementer note, no plan revision required.

### New issues found in Revision 1: None.

**Revision 1 verdict: APPROVED. Plan 103 is cleared for implementation.**
