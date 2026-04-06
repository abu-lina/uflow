---
ID: 083
Origin: 083
UUID: d7f2a41c
Status: Released
---

# Process Improvement Analysis 083: Plan 083 Retrospective Follow-Through

**Source Retrospective**: `agent-output/retrospectives/closed/083-admin-community-service-edit-retrospective.md`
**Date**: 2026-04-06T11:45Z
**Scope**: Validate Retrospective 083 recommendations PI-1–PI-3 against current agent instructions and instruction files; define and apply low-risk updates.

## Executive Summary

- **Recommendations analyzed**: 3 (PI-1, PI-2, PI-3)
- **Validated as real instruction gaps**: 3
- **Already partially covered**: 1 (PI-3 — security-expert.mdc flags "sensitive data in logs" generically, but no admin-route-specific rule existed)
- **Primary systemic issues**:
  - No implementer-owned gate requiring `open-actions` creation when deferring a RESOLVED in-scope plan milestone. The gap was first discovered by the Code Reviewer as a HIGH finding (H1), not caught by the implementer at handoff time.
  - Global Zod mock in `src/__tests__/setup.ts` silently voids all schema constraint tests in any file that does not call `vi.unmock('zod')`. No documentation existed for this trap; it would be rediscovered by every future implementer writing schema tests.
  - No specific rule in agent instructions or common pitfalls preventing raw request body logging in admin API error paths, despite the pattern being established as unsafe in the adjacent review route.
- **Overall risk**: **LOW** — all three changes are purely additive; no existing rules removed or weakened.
- **Recommendation**: Implement all three.

## Conflict Analysis

| PI | Target | Existing Coverage | Gap | Risk |
|----|--------|-------------------|-----|------|
| PI-1 | `copilot-instructions.md` Handoff Completeness section | "Bugfix Handoff Completeness" exists for bugfix-specific gates only | No equivalent for feature/milestone deferral | None — additive subsection |
| PI-2 | `copilot-instructions.md` Testing Patterns + `src/__tests__/setup.ts` | Testing Patterns shows basic Vitest example only | No warning about global mock voiding schema tests | None — additive blockquote + comment |
| PI-3 | `copilot-instructions.md` Common Pitfalls | `security-expert.mdc` flags "sensitive data in logs" generically | No admin-specific whitelisted-key logging rule | None — additive list item |

## Recommendations

### PI-1 — Implementer Milestone Deferral Gate (HIGH PRIORITY)

**Root cause**: Implementer deferred plan milestone M8 (D4 RESOLVED as in-scope) without creating an `open-actions` entry. The Code Reviewer discovered this as HIGH finding H1.

**Change**: Add "Implementation Handoff Completeness (Feature + Milestone Work)" subsection to `copilot-instructions.md` immediately after the existing "Bugfix Handoff Completeness" section. The rule: for any RESOLVED in-scope plan milestone marked `[ ]` (deferred), the implementer must create a corresponding `{ID}-open-actions.md` entry (with named approver and rationale) before submitting for code review. Code Reviewer must treat a missing entry as a HIGH finding.

**Target file**: `.github/copilot-instructions.md`

---

### PI-2 — Vitest Global Zod Mock Warning (MEDIUM PRIORITY)

**Root cause**: `src/__tests__/setup.ts` mocks `zod` globally so route tests stay fast. Any schema test file that does not call `vi.unmock('zod')` silently returns `{ success: true }` for every `parse()` call. Discovered by Code Reviewer as MEDIUM finding M2.

**Change**: (a) Add a blockquote warning after the Testing Patterns code example in `copilot-instructions.md`. (b) Add a 4-line comment block in `setup.ts` above the Zod mock explaining the trap and the `vi.unmock('zod')` fix.

**Target files**: `.github/copilot-instructions.md`, `src/__tests__/setup.ts`

---

### PI-3 — Admin Route Whitelisted Logging Rule (LOW PRIORITY)

**Root cause**: New admin edit route logged `{ body, error }` on validation failure. PII in request body (emails, phone numbers) can be persisted to log storage. The adjacent review route already used whitelisted-key logging; the pattern was not documented.

**Change**: Add item 8 to Common Pitfalls in `copilot-instructions.md`: admin API error/validation log calls must use whitelisted keys only (e.g., `{ id: body?.id, error: e.message }`).

**Target file**: `.github/copilot-instructions.md`
