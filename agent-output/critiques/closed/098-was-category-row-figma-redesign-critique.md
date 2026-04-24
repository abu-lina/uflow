---
ID: 098
Origin: 098
UUID: 4f2a8c1e
Status: Resolved
---

# Critique: Plan 098 — Was? Category Row Figma Redesign

| Field | Value |
|---|---|
| Artifact | `agent-output/planning/098-was-category-row-figma-redesign.md` |
| GitHub Issue | https://github.com/abu-lina/uflow/issues/156 |
| Figma | https://www.figma.com/design/mH4p6c8GExOuLn65WdSPMb/playground?node-id=224-7190&m=dev |
| Date | 2026-04-24T07:20Z |
| Critic | Critic |
| Status | OPEN |

## Changelog

| Date | Handoff | Request | Summary |
|---|---|---|---|
| 2026-04-24T07:20Z | Planner → Critic | Plan review before implementation | Initial critique |

---

## Value Statement Assessment

**Verdict: CLEAR ✅**

> "As a user, I want to see my cuisine selection displayed with its icon, name, and restaurant count — just like the other category rows — so that the Was? section feels visually consistent and it is immediately clear what I've selected."

- User story format: present ✅
- "So that" outcome: verifiable — visual consistency and clarity of active selection are testable ✅
- Master Objective alignment: directly supports the Was? food search UX, building on Plans 096–097 ✅
- Value delivered directly, not deferred: yes — the redesign itself delivers the stated outcome ✅

---

## Overview

Plan 098 is a tightly scoped UI redesign plan for the `WasCategoryResults` component. It adds a category image column to an existing RPC, extends a TypeScript interface, and redesigns a single component to match a Figma specification. The plan is well-structured, assumptions are pre-resolved, decision record is complete, and all RPC/interface changes are additive. No breaking changes.

---

## Architectural Alignment

**Alignment Status: ALIGNED ✅**

- Postgres-first: `CREATE OR REPLACE FUNCTION` migration pattern (M1) is consistent with migrations 070–074 in the same session.
- Frontend: `WasCategoryResults` is a feature-domain component in `src/features/search/components/` — correct placement per project rubric.
- `next/image` with `fill` prop + positioned parent: established pattern from `ProviderCard` — reuse is consistent with DRY.
- `safeJsonParse` utility reuse: correct — avoids duplicating JSON parse error handling.
- Token usage: all Tailwind classes (`bg-primary/10`, `text-text-primary`, `text-text-muted`, `font-inter-tight`) are from the design system, not raw hex values.

---

## Scope Assessment

Scope is appropriately narrow:
- One new migration (075), one interface field, one component, six locale files, one CHANGELOG entry.
- Explicitly excludes `WasMealResults` and the search-results state (query ≥ 2 changes are noted but scoped to same row design, correctly).
- Version bump deferred to DevOps Stage 1 — acceptable, though see Finding M1 below.

---

## Findings

### Medium

| # | Title | Status | Description | Impact | Recommendation |
|---|---|---|---|---|---|
| M1 | Semver bump not specified | RESOLVED | Plan states "confirm exact version at DevOps Stage 1" but does not state the bump type (patch). Plan requirements explicitly require semver bump type in the plan, not deferred. | Implementer may guess the wrong bump type or skip it. | Add: "Patch bump (0.x.y → 0.x.y+1) — purely additive UI/RPC change." |
| M2 | `category_images` column type underdefined for RPC | RESOLVED | M1 tasks say `c.category_images::TEXT` (JSONB → TEXT cast). This is correct but the plan does not state whether `category_images` column in the `categories` table is JSONB or TEXT. If it is JSONB, the cast is needed; if already TEXT, it is redundant but harmless. The implementer needs this confirmed to write the migration confidently. | Minor ambiguity only — wrong assumption would still work but creates a misleading cast. | Add a one-line fact: "Confirmed: `categories.category_images` column type is JSONB (consistent with `provider_images`)." |

### Low

| # | Title | Status | Description | Impact | Recommendation |
|---|---|---|---|---|---|
| L1 | Milestone dependency diagram inconsistent with plan text | OPEN | The Mermaid dependency graph shows `M3 → M4 → M5`, implying M4 requires M3 to complete. But the plan text correctly states M4 (translations) is independent and can run in parallel with M3. The diagram should reflect this. | No implementation risk — text is authoritative. Cosmetic inconsistency only. | Add `M3` and `M4` as parallel arrows both pointing to `M5`, or add a note `M4 parallel with M3`. |
| L2 | Accessibility: remove button aria-label not specified | RESOLVED | M3 acceptance criteria and task list do not mention an `aria-label` for the circular remove button. The button contains only a visually-rendered icon (no text), making it inaccessible without an explicit label. | Screen reader users cannot identify the remove action. | Added `aria-label={t('suchen.was.removeSelection')}` to M3 task list and acceptance criteria; added `removeSelection` translation key to M4 for all 6 locales. |
| L3 | `🍽` emoji fallback may render inconsistently across OS/device | RESOLVED | The plan specifies an emoji (`🍽`) as the placeholder inside the icon slot when no category image exists. Emoji rendering varies significantly across Android, iOS, and desktop, which may look out of place in a polished food app. | Minor visual inconsistency on some devices. | Updated plan: placeholder changed to `<UtensilsCrossed />` from `lucide-react` (already a dependency), centred inside a `bg-primary/10` square. Decision record updated accordingly. |

---

## Unresolved Open Questions

None — all assumptions in the plan are marked `[RESOLVED]`. All Decision Record entries are `[RESOLVED]`. No unresolved open questions found.

---

## Duration Estimates Check

Duration Estimates section present ✅ — M1 through M5 individually estimated with uncertainty ratings.

---

## Risk Assessment

Risks section is present and adequate. The "High likelihood" risk of missing `category_images` data is correctly identified and mitigated. One additional risk not in the plan:

> If `next/image` is used with `fill` inside a non-positioned parent, the image will be invisible at runtime. The implementer must ensure the icon container uses `position: relative` (i.e., the Tailwind `relative` class on the parent). This is a common pitfall. Recommend adding to M3 acceptance criteria: "Icon image renders visibly at 48×48 on mobile viewport."

This is LOW severity — the ProviderCard pattern already demonstrates the correct approach.

---

## Recommendations

1. **(MUST before implementation)** Add patch semver bump type to the plan (Finding M1).
2. **(MUST before implementation)** Confirm `category_images` column DB type is JSONB and add that to the plan (Finding M2).
3. **(SHOULD)** Fix the Mermaid diagram to show M3 and M4 as parallel (Finding L1).
4. **(SHOULD)** Add `aria-label` requirement to M3 acceptance criteria (Finding L2).
5. **(NICE TO HAVE)** Replace emoji placeholder with a Lucide icon (Finding L3).

**Blocking findings**: M1 and M2 are MEDIUM severity. Per review standards (HIGH → reject; MEDIUM → fix recommended), these are fixable with a quick plan update and do not require full re-plan.

**Verdict**: **APPROVED** — M1 and M2 MEDIUM findings resolved inline (plan updated). Low findings (L1 Mermaid diagram also fixed inline; L2 aria-label and L3 emoji placeholder are implementation-time concerns for the Implementer to address per acceptance criteria).

---

## Revision History

| Revision | Date | Changes | Status |
|---|---|---|---|
| Initial | 2026-04-24T07:20Z | First critique | OPEN — awaiting M1/M2 fixes |
| Revision 1 | 2026-04-24T07:30Z | Applied M1 (semver), M2 (JSONB confirm), L1 (diagram) fixes inline to plan. M1/M2 marked RESOLVED. Verdict changed to APPROVED. | APPROVED |
| Revision 2 | 2026-04-24T07:40Z | Applied L2 (aria-label + removeSelection key) and L3 (Lucide placeholder) to plan. All findings RESOLVED. | APPROVED — All Findings Resolved |
