---
ID: 131
Origin: 131
UUID: a6b3d9f7
Status: Resolved
---

# Critique: Plan 131 — RowItem Component System

| Field        | Value                                                                   |
| ------------ | ----------------------------------------------------------------------- |
| Artifact     | `agent-output/planning/131-row-item-component-system.md`                |
| Date         | 2026-05-12T19:42Z                                                       |
| Status       | **APPROVED**                                                            |

## Changelog

| Date              | Handoff          | Request         | Summary                         |
| ----------------- | ---------------- | --------------- | ------------------------------- |
| 2026-05-12T19:42Z | Planner → Critic | Initial review  | First critique pass             |
| 2026-05-12T19:48Z | Critic → Planner | Revision request | F-1/F-2/F-3 addressed by Planner: WerAudienceFilter added as M4b; D6 extended to four surfaces; GitHub issue #228 created |

---

## Value Statement Assessment

**Verdict: PASS**

The value statement is clear, follows user-story format, identifies the developer as the beneficiary, and names a concrete outcome: "zero ad-hoc markup per feature" for row-style lists. The objective is specific, the component family is well-scoped, and the connection to Plan 130 as foundation is explicit.

---

## Overview

A well-structured, logically sequenced plan that builds correctly on Plan 130's `IconListRow` primitive. Decisions D1–D7 are all resolved with explicit rationale. The consumer audit table is evidence-based with real visual-change flags. The milestone dependency graph is a strong planning artefact. Duration estimates are present and plausible.

**One MEDIUM gap** requires a plan revision before implementation can proceed.

---

## Architectural Alignment

**Verdict: ALIGNED**

- `RowItem` in `src/components/ui/` is correct per the Placement Rubric (generic UI atom, shared across features).
- Wrapping `IconListRow` (not duplicating it) is architecturally sound — respects the layering decision from Plan 130.
- No `'use client'` on a purely presentational component is correct (Plan 130 lesson applied).
- Controlled `CounterTrailing` aligns with React's controlled-component pattern; prevents stale-state bugs in form/basket contexts.
- ARIA strategy (D7: `multiSelect` → `role="checkbox"`) is consistent with existing FilterSection test coverage (`getByRole('checkbox', ...)`), meaning tests should pass after migration with no selector changes.

---

## Scope Assessment

**Verdict: INCOMPLETE — one existing consumer is missing from the audit**

### Missing Consumer: `WerAudienceFilter`

The plan's consumer audit lists 5 consumers (all current `IconListRow` users). However, `WerAudienceFilter.tsx` already implements the exact icon + title + subtitle + counter pattern Plan 131 is standardising — it was shipped in Plan 103 *before* `IconListRow` existed, so it never went through a Plan 130 migration.

Key facts:
- `WerAudienceFilter` has an inline `AudienceRow` component at line ~146 that renders: `h-12 w-12` icon container → primary label → `text-base font-light` subtitle → inline `−`/`+` counter with SVG icons
- The inline counter (lines ~175–205) is precisely the pattern `CounterTrailing` is being introduced to replace
- The inline `MinusIcon` and `PlusIcon` SVG helpers exist only because there is no shared counter primitive
- **If Plan 131 ships `CounterTrailing` without migrating `WerAudienceFilter`, the counter pattern will be duplicated the moment the component goes live** — the same issue Plan 130 fixed for layout, Plan 131 creates again for the counter

See **Finding F-1** below.

---

## Technical Debt Risks

- **LOW**: `CounterTrailing` ships as a new atom with no immediate consumer (Wer? is the obvious first consumer but is excluded from scope). This is flagged as a risk in the plan but treated as acceptable. The Critic agrees it is low-risk, *conditional* on F-1 being addressed.
- **LOW**: `InfoTrailing`'s `onPress` path has no current consumer that uses a press handler — it ships as decorative only. Fine, but implementer should ensure the `<button>` variant is tested to avoid dead-code drift.
- **LOW**: Subtitle typography normalisation on `AttestationCard` (D6) is explicitly flagged with a QA legibility gate — this is correct process.

---

## Findings

### F-1: `WerAudienceFilter` absent from consumer audit — `CounterTrailing` ships without migrating its most obvious consumer

| Field          | Value                                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Severity       | **MEDIUM**                                                                                                             |
| Status         | OPEN                                                                                                                   |
| Issue          | `WerAudienceFilter.tsx` implements an inline `AudienceRow` with an icon container, title, subtitle, and a fully inline ± counter (with its own `MinusIcon`/`PlusIcon` SVG components). This is precisely the `RowItem + CounterTrailing` pattern being introduced, but the file is absent from the consumer audit and from the Files Touched table. If `CounterTrailing` is introduced without migrating `WerAudienceFilter`, the counter duplication is not eliminated — it just becomes two separate implementations. |
| Impact         | `CounterTrailing` does not deliver its stated de-duplication value until `WerAudienceFilter` is migrated. Inline `MinusIcon`/`PlusIcon` SVG helpers remain duplicated. |
| Recommendation | Add `WerAudienceFilter.tsx` as **Milestone 4b** (or merge into M4 if the implementer prefers). It is a search feature component (same directory as the other M4 consumers). The migration is mechanical: `AudienceRow` becomes `<RowItem selectable={false} icon={...} title={label} subtitle={t('...')} trailing={<CounterTrailing value={count} onIncrement={onIncrement} onDecrement={onDecrement} min={0} />} />`. The inline `MinusIcon`, `PlusIcon`, and `AudienceRow` helpers can be deleted. Update the Files Touched table and duration estimate accordingly. |

### F-2 (LOW): `WerAudienceFilter` uses `text-base font-light text-text-muted` subtitle — same normalisation caveat as D6

| Field          | Value                                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Severity       | **LOW**                                                                                                                |
| Status         | RESOLVED                                                                                                               |
| Issue          | `WerAudienceFilter`'s `AudienceRow` subtitle uses `font-inter-tight text-base font-light leading-none text-text-muted` — same `text-base` size as the other consumers flagged in the plan for normalisation. When F-1 is addressed, this normalisation should be acknowledged explicitly in the decision record or added to the D6 visual-change note so QA knows to check the Wer? section too. |
| Impact         | Without an explicit call-out, the implementer or QA may miss the subtitle change in the Wer? accordion section. |
| Recommendation | Extend D6 (or add D8) to explicitly name `WerAudienceFilter` as a third surface with subtitle normalisation. Add "Wer? section" to the QA legibility check list. |

### F-3 (LOW): Process note — GitHub issue not yet created

| Field          | Value                                                              |
| -------------- | ------------------------------------------------------------------ |
| Severity       | **LOW**                                                            |
| Status         | RESOLVED — Issue [#228](https://github.com/abu-lina/uflow/issues/228) created; plan header updated. |
| Issue          | GitHub Issue field was `(to be created)`. Per UFlow convention, the issue should be created before implementation starts to enable PR linking. |
| Impact         | None on plan quality. Minor process gap. |
| Recommendation | Resolved. |

---

## Unresolved Open Questions

None — the plan contains no `OPEN QUESTION` items.

## Decision Record Check

All 7 decisions (D1–D7) are marked `[RESOLVED]` with rationale. No `[OPEN]` or `[DEFERRED]` decisions.

## Duration Estimates Check

**PASS** — Duration Estimates section present with phase breakdown (Implementation: 3–4h, TDD Tests: 1–1.5h, Visual QA: 30–45m, DevOps: 15m, Total: ~5–6h). Note: if F-1 is addressed (adding `WerAudienceFilter` migration), the implementation estimate should increase by ~30–45 min.

---

## Hotfix Scenario Check

**"How will this plan result in a hotfix after deployment?"**

Low risk. Pure presentational refactor + new UI atoms. No data layer, auth, or API changes. The most likely hotfix scenario is a visual regression in the Wer? stepper (if WerAudienceFilter is migrated per F-1 and the counter layout differs from the current inline implementation). The QA legibility gate and existing Wer? tests mitigate this adequately.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `WerAudienceFilter` counter layout differs from `CounterTrailing` (gap, button size, icon style) causing visual regression | Medium (if F-1 addressed) | Low | Implementer should match existing `size-6` buttons, `gap-2`, SVG icon style in `CounterTrailing` visual spec |
| AttestationCard subtitle normalisation degrades legibility of commitment details | Medium | Low | QA legibility gate (D6) in place; UAT sign-off required |
| Subtitle normalisation in Wer? section (if F-1 addressed) changes subtitle visible on audience rows | Low | Low | Extend D6/QA scope |

---

## Recommendations

1. **Address F-1 (MEDIUM)**: Add `WerAudienceFilter.tsx` to the migration scope as M4b. `CounterTrailing` without this migration doesn't eliminate counter duplication.
2. **Address F-2 (LOW)**: Extend D6 (or add D8) to name `WerAudienceFilter` as a third subtitle-normalisation surface.
3. **Address F-3 (LOW, non-blocking)**: Create the GitHub issue before implementation starts.

---

## Verdict

**APPROVED**

All findings resolved:
- F-1 (MEDIUM): WerAudienceFilter added to consumer audit and as M4b; inline AudienceRow/MinusIcon/PlusIcon migration scoped; dependency graph updated; Files Touched and duration updated.
- F-2 (LOW): D6 extended to name all four normalisation surfaces including WerAudienceFilter; QA gate extended accordingly.
- F-3 (LOW): GitHub issue #228 created; plan header back-referenced.

Plan is cleared for implementation.

## Revision History

| Revision | Date              | Findings Addressed | New Findings | Status Changes           |
| -------- | ----------------- | ------------------ | ------------ | ------------------------ |
| Initial  | 2026-05-12T19:42Z | —                  | F-1, F-2, F-3 | REVISION REQUESTED      |
| Rev 1    | 2026-05-12T19:48Z | F-1, F-2, F-3      | None          | Verdict: APPROVED       |
