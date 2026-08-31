---
ID: 205
Origin: 205
UUID: a4e9c1f3
Status: Committed for Release v0.15.9
---

# Plan 205 — Add iOS Keyboard Attributes to ChatInput Textarea

| Field          | Value                                                                  |
| -------------- | ---------------------------------------------------------------------- |
| Plan ID        | 205                                                                    |
| Target Release | Next available patch after v0.15.8 (current origin/main); confirm at DevOps Stage 1 |
| Epic Alignment | Mobile UX — reduce friction for iOS chat users                         |
| Related Issues | None                                                                   |
| Classification | Bugfix                                                                 |
| Pipeline       | Abbreviated (Analyst → Planner → Implementer → Code Reviewer → QA → DevOps) |
| GitHub Issue   | https://github.com/abu-lina/uflow/issues/304                           |
| Created        | 2026-08-09T14:00Z                                                      |

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-08-09T14:00Z | @Planner | Initial plan created |
| 2026-08-09T21:15Z | @Implementer | Implementation started (TDD-first execution) |
| 2026-08-09T21:30Z | @Code Reviewer | Code Review APPROVED |
| 2026-08-09T21:35Z | @QA | QA Phase Complete — scoped tests 7/7 PASS, type-check clean, no chat-related regressions |

---

## Value Statement and Business Objective

As an **iOS user** composing chatbot messages, I want the keyboard to provide **autocorrect, auto-capitalisation, spell-check suggestions, and a Send key hint**, so that I can type natural-language queries quickly with fewer typos.

---

## Decision Record

| # | Decision | Status |
|---|----------|--------|
| 1 | Fix applies to ChatInput.tsx only — sole chat textarea | [RESOLVED] Single surface confirmed by Analyst (F2) |
| 2 | Attributes: `autoCorrect="on"` `autoCapitalize="sentences"` `spellCheck={true}` `enterKeyHint="send"` | [RESOLVED] Standard HTML/iOS spec behaviour (F3) |
| 3 | No version bump in this plan — bundled into next patch release | [RESOLVED] Micro-fix; version managed at release level |
| 4 | No SSR/hydration risk | [RESOLVED] React 19 / Next.js 15 aligns boolean attrs (F4) |

---

## Release Strategy

Standalone (no other known active plans for the next patch after v0.15.8 at this time).

---

## Duration Estimates

| Phase | Estimate | Notes |
|-------|----------|-------|
| Analysis | ✅ Done | 15 min |
| Planning | ✅ Done | 10 min |
| Implementation | 10–15 min | 4 attrs + 1 test block |
| Code Review | 5 min | Trivial change |
| QA | 5–10 min | Attribute presence test only (manual iOS check is UAT) |
| DevOps | 5 min | Standard commit flow |

Total: < 1 hour end-to-end.

---

## Milestones

### Milestone 1 — Implementation

**Objective:** Add four iOS keyboard attributes to the ChatInput textarea and add regression tests.

**File changes:**

1. `src/features/chat/components/ChatInput.tsx` — Add four props to the `<textarea>` element at line 47:
   - `autoCorrect="on"`
   - `autoCapitalize="sentences"`
   - `spellCheck={true}`
   - `enterKeyHint="send"`

2. `src/__tests__/features/chat/ChatInput.test.tsx` — Add a new test block verifying the four attributes are rendered on the textarea element.

**Acceptance criteria:**
- [ ] The four attributes appear on the rendered `<textarea>` in the DOM
- [ ] Existing 6 tests continue to pass (no regressions)
- [ ] New test asserts presence of all four attributes
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes

---

### Milestone 2 — Code Review

**Acceptance criteria:**
- [ ] Change is limited to the two files listed above
- [ ] No unrelated modifications introduced
- [ ] Attribute values match the spec in Decision Record #2
- [ ] Test assertions use correct lowercase HTML attribute names (`autocorrect`, `autocapitalize`, `spellcheck`, `enterkeyhint`)

---

### Milestone 3 — QA Verification

**Acceptance criteria:**
- [ ] `npm test` passes (all tests green including new attribute assertions)
- [ ] `npm run type-check` clean
- [ ] `npm run lint` clean
- [ ] No snapshot or visual regression

---

### Milestone 4 — DevOps (Commit & Version)

**Acceptance criteria:**
- [ ] Changes committed to branch `session/205-chatbot-ios-autocomplete`
- [ ] Commit message: `fix(chat): add iOS keyboard attributes to ChatInput textarea`
- [ ] Plan status updated to Committed, analysis moved to closed/

---

## Testing Strategy

**Test type:** Unit (attribute presence assertion)

**Approach — Client-State Precedence Regression Pattern:**

The bug is a static attribute omission (not a conditional render or state-precedence issue). A simple attribute-presence test is sufficient:

```
Test: "renders textarea with iOS keyboard attributes"
Assert: textarea has autocorrect="on"
Assert: textarea has autocapitalize="sentences"  
Assert: textarea has spellcheck="true"
Assert: textarea has enterkeyhint="send"
```

This prevents future removal of these attributes from going undetected.

**Coverage:** The test sits alongside the 6 existing ChatInput tests in the same describe block. No mocking required — the component renders without external dependencies.

---

## Out of Scope

- Other `<textarea>` elements in the codebase (provider forms, admin modals, etc.) — these are not chat inputs and have different UX requirements
- ESLint rule for mandatory iOS attributes — desirable future improvement, not required for this bugfix
- Manual iOS device testing — responsibility of UAT phase, not this plan's QA gate
- Version bump — handled at release level

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Attribute stripped by future refactor | Low | Medium | Regression test prevents silent removal |
| Unexpected mobile browser behaviour | Very Low | Low | Attributes are standard HTML; graceful degradation on unsupported browsers |

---

## Validation & Handoff Notes

- Implementer should run `npm test` and `npm run type-check` before marking complete
- Code Reviewer verifies the diff is exactly 2 files, ~8 lines changed
- QA runs the full test suite; no manual browser testing needed at this gate
- UAT (if performed) would involve typing in the chat on an iPhone to confirm QuickType bar appears

---

## Open Questions

None. All questions resolved during analysis phase.
