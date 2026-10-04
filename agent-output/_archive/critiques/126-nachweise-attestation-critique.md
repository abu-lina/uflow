---
ID: 126
Origin: 126
UUID: a7f3c2d8
Status: REVISED — Awaiting re-review
---

# Critique — Plan 126: Nachweise Attestation Display

| Field           | Value                                                                          |
| --------------- | ------------------------------------------------------------------------------ |
| Artifact        | `agent-output/planning/126-nachweise-attestation-plan.md`                      |
| Analysis Doc    | N/A                                                                            |
| Date (Initial)  | 2026-05-05T21:30Z                                                              |
| Status          | OPEN                                                                           |
| Critic          | GitHub Copilot (Critic mode)                                                   |
| GitHub Issue    | https://github.com/abu-lina/uflow/issues/219                                  |

## Changelog

| Date              | Handoff              | Request          | Summary                                                          |
| ----------------- | -------------------- | ---------------- | ---------------------------------------------------------------- |
| 2026-05-05T21:30Z | Planner → Critic     | Initial review   | Critique created                                                 |
| 2026-05-06T09:00Z | Critic → Planner     | Revision R1      | Plan revised; all 4 findings addressed — re-review required      |

---

## Value Statement Assessment

**PASS.**

The value statement is present, correctly formatted, and directly aligned with the platform's community trust mission:

> *"As a Muslim community user... I want to see a clear Islamic attestation... so that I can trust the provider meets my religious dietary/service requirements at a glance."*

The "so that" outcome is observable, measurable at QA, and directly delivers value. No deferral. No proxy for the real goal. **Excellent.**

---

## Overview

Plan 126 is a well-scoped UI feature that renders an Islamic declaration card in the existing Nachweise accordion, driven by boolean columns (`no_alcohol`, `no_pork`, `no_gambling`) already on the `Provider` type. The design is data-driven, incremental, and consistent with the established `DetailListItem` + `ExpandSection` pattern.

Overall quality is high. One MEDIUM blocking finding must be addressed before implementation: the plan's core data assumption is incomplete and risks a silent zero-display bug depending on migration state.

---

## Architectural Alignment

- **ExpandSection pattern**: Correctly targeted. Card goes inside the existing `providerDetail.sections.proofs` block.
- **i18n pattern**: Six locales addressed. Keys correctly nested under `providerDetail.attestation`.
- **TypeScript type**: `Provider` already declares `no_alcohol?: boolean`, `no_pork?: boolean`, `no_gambling?: boolean` — no type changes needed.
- **Component placement**: `src/features/providers/components/ProviderDetailSections.tsx` is the correct locus.
- **No schema migration**: Plan correctly asserts none is needed for the display layer.

Alignment is **strong** with one exception noted in findings.

---

## Scope Assessment

Scope is tight and appropriate for a patch release:
- 3 milestones, all bounded to one component file and translation files
- No new database tables, no new service layer, no API changes
- Duration estimate (~1–1.5 hrs) is credible given the simplicity
- `no e2e required` rationale is sound for static, non-interactive presentation

---

## Technical Debt Risks

Low overall. The conditional-bullet approach (only show declared items) is correct and avoids hardcoding. However, the plan would benefit from the implementer being alerted to the extension table migration state (see findings).

---

## Findings

### MEDIUM — Extension Table Migration State Not Addressed

| Field          | Detail                                                                                                                                                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**     | OPEN                                                                                                                                                                                                                         |
| **Section**    | Assumptions                                                                                                                                                                                                                  |
| **Issue**      | The plan states: *"no schema migration required — all data is already available in the Provider type."* This is correct for the TypeScript type, but incomplete at the database layer.                                       |
| **Detail**     | Migration `083_m5a_supertype_unification.sql` (M-5) moves `no_alcohol`, `no_pork` to the `food_providers` extension table and `no_gambling` to `store_providers`, then **drops those columns from `providers`** (Step 10). The `Provider` type already documents this with the comment: *"undefined when not joined."* The current server query (`.select('*', ...)` on providers) does NOT join extension tables. If migration 083 has been applied to the remote DB, all three booleans will be `undefined` for every provider, and the attestation card will never render — silently, without error. |
| **Impact**     | If migration 083 is applied and the implementer proceeds without verifying column availability, the feature deploys and displays nothing for all providers. This is a silent zero-display regression.                         |
| **Recommendation** | Before M1 begins, the implementer must: (1) Confirm which migration state applies to the remote DB (is `no_alcohol` still on `providers` or on `food_providers`?). (2) If extension tables are active, a JOIN or secondary fetch is required to populate these values on the server. The plan should document this as a pre-condition check. |

---

### MEDIUM — Semantic Mismatch: `no_pork` → "verbotenes Fleisch"

| Field          | Detail                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Status**     | OPEN                                                                                                                                       |
| **Section**    | Decision Record, Milestones                                                                                                                |
| **Issue**      | The column name is `no_pork`, but the user-facing attestation text is *"kein verbotenes Fleisch verarbeite/verkaufe"* (no forbidden meat — a broader concept covering pork, non-halal slaughter, etc.). |
| **Detail**     | This semantic expansion is directionally correct (broader protection is not harmful), but it changes the guarantee: a provider could have `no_pork = true` and still serve non-halal chicken, yet the attestation would read "kein verbotenes Fleisch." This overstates the commitment. |
| **Impact**     | Trust-critical overpromise to users. If a provider sells only halal beef but not pork, the attestation would claim "no forbidden meat" — which could be factually false. This risks damaging user trust if discovered.                  |
| **Recommendation** | Either (a) restrict the bullet text to exactly what the boolean means: *"kein Schweinefleisch verarbeite/verkaufe"* (no pork), or (b) add a new `no_forbidden_meat` boolean with a proper DB column and migration — do not expand semantics by translation alone. Option (a) is simpler and safer. |

---

### LOW — No Semver Bump Specified

| Field          | Detail                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Status**     | OPEN                                                                                                                        |
| **Section**    | Plan Header                                                                                                                 |
| **Issue**      | Target release is listed as *"next available patch after v0.12.9"* but no explicit semver bump type is stated (patch/minor). |
| **Impact**     | Minor process gap. No blocker.                                                                                              |
| **Recommendation** | This is a user-visible feature addition (new UI element). Semver guidance leans toward minor (`0.13.0`) rather than patch. Confirm with project owner at DevOps stage. |

---

### LOW — No Acceptance Criteria for Translation Quality Gate

| Field          | Detail                                                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**     | OPEN                                                                                                                                         |
| **Section**    | Milestone 1, Risks                                                                                                                           |
| **Issue**      | Milestone 1 acceptance is *"All 6 translation files updated. `npm run type-check` passes."* The Risks section flags translation accuracy but offers no gate for it. |
| **Detail**     | Translation correctness for the attestation text (especially Arabic, Urdu, Pashto) is not verified by `type-check` alone. Incorrect Arabic translation in a religious declaration could be offensive. |
| **Impact**     | Low technical risk; medium community trust risk.                                                                                             |
| **Recommendation** | Add an explicit note: *"Arabic/Turkish/Urdu/Pashto translations are provisional and require native speaker sign-off before production merge."* This can be a QA gate item. |

---

## Unresolved Open Questions

The plan has **no `OPEN QUESTION` items** — all Decision Record entries are `[RESOLVED]`. The MEDIUM finding above surfaces an undocumented assumption that functions as an implicit open question. It should be acknowledged by the implementer.

---

## Risk Assessment

| Risk                                           | Level  | Status    |
| ---------------------------------------------- | ------ | --------- |
| Extension table migration state causes silent zero-display | HIGH   | Unaddressed (see MEDIUM finding) |
| `no_pork` → "forbidden meat" semantic overpromise | MEDIUM | Unaddressed (see MEDIUM finding) |
| Translation accuracy for RtL locales           | LOW    | Risk noted, no gate defined |

---

## Recommendations

1. **Block on MEDIUM #1**: Implementer verifies migration 083 state against remote DB before writing code. If columns are in extension tables, the server fetch in `providers.server.ts` must be extended before the UI can display the attestation.
2. **Block on MEDIUM #2**: Narrow `no_pork` bullet text to factually match the boolean (pork specifically, not all forbidden meat), unless a dedicated `no_forbidden_meat` column exists.
3. LOW items can be addressed in parallel; they do not block implementation start once the MEDIUMs are resolved.

---

## Verdict

**REVISION REQUESTED** — two MEDIUM findings must be addressed in the plan (or explicitly acknowledged as implementer pre-conditions) before handoff.

The plan is structurally excellent and close to approvable. Both MEDIUM items are resolvable with small amendments (one adds a pre-condition check, one clarifies text semantics). No re-architecture required.

---

## Revision History

| Rev | Date              | Changes                                                        | Findings Addressed            | New Findings | Status              |
| --- | ----------------- | -------------------------------------------------------------- | ----------------------------- | ------------ | ------------------- |
| 0   | 2026-05-05T21:30Z | Initial critique created                                       | —                             | 4 total      | OPEN                |
| 1   | 2026-05-06T09:00Z | Plan R1 by Planner: Milestone 0 added (extension table pre-check); `no_pork` text narrowed to "kein Schweinefleisch" (Decision 7); semver bump type clarified to minor (v0.13.0); M1 acceptance updated with native speaker sign-off gate for RtL translations | MEDIUM×2, LOW×2 | 0 | REVISED — Awaiting re-review |
