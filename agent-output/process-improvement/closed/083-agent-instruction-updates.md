---
ID: 083
Origin: 083
UUID: d7f2a41c
Status: Released
---

# Agent Instruction Updates 083: Plan 083 Process Improvements (PI-1–PI-3)

**Source Analysis**: `agent-output/process-improvement/083-process-improvement-analysis.md`
**Source Retrospective**: `agent-output/retrospectives/closed/083-admin-community-service-edit-retrospective.md`
**Date**: 2026-04-06T11:45Z
**Implementer**: process-improvement

## Summary

3 recommendations from Retrospective 083 implemented across 2 files. All changes are additive — no existing rules were removed or weakened.

## Files Updated

| File | PI | Kind |
|------|----|------|
| `.github/copilot-instructions.md` | PI-1 — Implementation Handoff Completeness | New subsection after Bugfix Handoff Completeness |
| `.github/copilot-instructions.md` | PI-2 — Global Zod mock warning | Blockquote added after Testing Patterns code example |
| `.github/copilot-instructions.md` | PI-3 — Admin route whitelisted logging | Item 8 added to Common Pitfalls |
| `src/__tests__/setup.ts` | PI-2 — Global Zod mock warning | 4-line comment block above Zod mock |

---

## Changes by Recommendation

### PI-1 — Implementation Handoff Completeness (`.github/copilot-instructions.md`)

**Status**: ✅ Implemented

**Before**: "Bugfix Handoff Completeness" section covered only bugfix-specific checklist items (implementation doc, TDD table, regression tests, test evidence). No equivalent gate existed for feature/milestone work where RESOLVED in-scope milestones are deferred at implementation time.

**After**: Added `#### Implementation Handoff Completeness (Feature + Milestone Work)` subsection immediately after the Client-State Precedence Regression Pattern block, before the `## Code Conventions` heading. Rule: for each RESOLVED in-scope plan milestone marked `[ ]` (deferred), the implementer must create a corresponding `open-actions` entry with a named approver and rationale before CR handoff. Code Reviewer must treat a missing entry as a HIGH finding.

**Downstream effect**: Code Reviewer now has explicit authority to raise a HIGH finding for missing deferral documentation, and implementer has a clear pre-handoff checklist item. Prevents the Plan 083 pattern where H1 was discovered by CR rather than self-reported at submission.

---

### PI-2 — Vitest Global Zod Mock Warning

**Status**: ✅ Implemented

**Before (copilot-instructions.md)**: Testing Patterns section showed only a basic Vitest + RTL example. No mention of the global Zod mock or its effect on schema validation tests.

**After (copilot-instructions.md)**: Added blockquote warning immediately after the closing ` ``` ` of the code example:
> **Global Zod mock warning**: `src/__tests__/setup.ts` mocks `zod` globally so route tests that import schemas stay fast. Schema unit test files **must** call `vi.unmock('zod')` before the first `describe` block, or all `parse()` calls silently return `{ success: true }` regardless of actual constraints. See `memories/repo/testing-conventions.md`.

**Before (setup.ts)**: Single-line comment `// Mock zod` before the mock block.

**After (setup.ts)**: Replaced with 4-line comment:
```typescript
// Mock zod — speeds up route/API tests that import schemas.
// IMPORTANT: Schema unit test files must call vi.unmock('zod') before the first
// describe block, or parse() will always return { success: true } regardless of
// actual validation constraints. See memories/repo/testing-conventions.md.
```

**Supporting artifact**: `memories/repo/testing-conventions.md` — written during retrospective phase with full explanation.

---

### PI-3 — Admin Route Whitelisted Logging (`.github/copilot-instructions.md`)

**Status**: ✅ Implemented

**Before**: Common Pitfalls listed 7 items. `security-expert.mdc` flagged "sensitive data in logs" generically. No admin-API-specific logging rule existed anywhere in the instruction files.

**After**: Added item 8 to Common Pitfalls:
> 8. **Admin route logging**: Never log raw `body`, `payload`, or the full request object in admin API error/validation paths — use whitelisted keys only (e.g., `{ id: body?.id, error: e.message }`). Raw request logging can persist PII to log storage.

---

## Validation

| Check | Result |
|-------|--------|
| PI-1 — "Implementation Handoff Completeness" present in copilot-instructions.md (line ~198) | ✅ grep confirmed |
| PI-1 — Code Reviewer HIGH finding gate stated explicitly | ✅ present in text |
| PI-2 — Zod mock blockquote present in copilot-instructions.md (line ~175) | ✅ grep confirmed |
| PI-2 — 4-line comment present in setup.ts (lines 45–48) | ✅ grep confirmed |
| PI-3 — Common Pitfalls item 8 present in copilot-instructions.md (line ~261) | ✅ grep confirmed |
| No existing rules removed or weakened | ✅ all changes are additive |
| `memories/repo/testing-conventions.md` written | ✅ created during retrospective phase |

## Changelog

| Date (UTC) | Agent | Event |
|------------|-------|-------|
| 2026-04-06T11:45Z | process-improvement | PI-1/PI-2/PI-3 applied; Status: Released |
