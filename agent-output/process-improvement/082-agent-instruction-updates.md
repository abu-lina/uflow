---
ID: 82
Origin: 82
UUID: d7e3a1f9
Status: Applied
---

# Agent Instruction Updates 082

**Derived from**: Process Improvement Analysis 082  
**Date**: 2026-04-06T11:20Z  
**Author**: retrospective

This document contains the exact text changes recommended for agent instruction files. Each change is marked with the target file and location. Applying these changes is optional for the PI agent — they are pre-drafted ready-to-use text.

---

## Change 1: UAT mode instructions — Version Recommendation

**Target**: UAT mode instructions (equivalent section: "Release Readiness" → "Version Recommendation")  
**Priority**: CRITICAL

**Current pattern** (inferred from practice):
> Recommend version `v{MAJOR}.{MINOR}.{PATCH+1}` (e.g., v0.10.9)

**Replace with**:
> **Do not specify a hardcoded version number.** Versions depend on git tags present on `origin` at DevOps execution time, which may differ from the current package.json due to parallel worktree sessions.
>
> Instead, write:
> > "Recommend: next available patch version after `{current package.json version}`. DevOps to confirm at Stage 1 via `git fetch --tags` and select the next available patch number."
>
> DevOps owns the final version number. UAT owns the recommendation to increment and the increment type (patch/minor/major).

**Rationale**: Parallel worktree sessions may bump versions independently. UAT can never reliably know the highest existing tag without running `git fetch --tags` at the moment of Stage 1. Version collisions add 1–2 document updates and 5–30 minutes to DevOps execution. This change eliminates the collision class entirely.

---

## Change 2: DevOps mode instructions — Stage 2 Environment Setup

**Target**: DevOps mode instructions (equivalent section: "Stage 2" → environment setup)  
**Priority**: HIGH

**Add the following as the first step before any git operation in Stage 2**:

> **Stage 2 Environment Pre-Flight (MANDATORY)**  
> Before running any git operation in Stage 2, execute:
> ```bash
> export GIT_PAGER=''
> export GIT_TERMINAL_PROMPT=0
> ```
>
> Or, add `--no-pager` flag to every git command:
> ```bash
> git --no-pager rebase origin/main
> git --no-pager merge origin/main
> git --no-pager log --oneline -10
> ```
>
> **Why**: VS Code integrated terminals may have `PAGER=less` configured. Long-output git operations (rebase, log, diff) trigger an interactive pager that halts with no visible output. The command appears to succeed but does nothing. Symptoms: no output after git command, no error, terminal returns to prompt immediately. This is indistinguishable from success unless the result is verified.

**Rationale**: This is the second occurrence of pager-blocking across DevOps sessions. The first occurrence (Plan 033) added ~30 minutes to a Stage 2 execution. The second (Plan 082) added ~20 minutes and forced a switch from rebase to merge, introducing 4 bookkeeping conflicts that rebase would have avoided.

---

## Change 3: `.github/copilot-instructions.md` — Bugfix Regression Test Adequacy

**Target**: `.github/copilot-instructions.md`, section: "Bugfix Handoff Completeness"  
**Priority**: MEDIUM

**Add the following to the Bugfix Handoff Completeness section** (after the TDD Compliance table requirement):

> **Regression Test Assert Rule**  
>
> For bugfixes involving visible or interactive UI elements, the regression test MUST assert real DOM state:
>
> ```typescript
> // ✅ CORRECT: Asserts real user-observable element
> expect(screen.getByRole('searchbox')).toBeInTheDocument();
> expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
>
> // ❌ WRONG: Asserts mock marker — proves only tree composition, not real rendering
> expect(screen.getByTestId('my-mock-component-marker')).toBeInTheDocument();
> ```
>
> **Rule**: Do not mock the component under test. Mock surrounding providers, data fetchers, and contexts. If the component requires context providers, provide a test wrapper with real (or mock-minimal) providers rather than replacing the entire component with a div.

**Rationale**: When a mock replaces the component under test, the test proves the parent includes a mock div — not that the component renders interactive UI. For visibility bugs (this bug class: "element disappears under condition X"), a mock-assertion test would pass even if the real component failed to render. This creates illusory coverage.

---

## Change 4: QA mode instructions — Regression Adequacy Gate

**Target**: QA mode instructions (equivalent section: "Regression Test Adequacy")  
**Priority**: MEDIUM

**Add the following check to the QA regression adequacy review**:

> **Mock Assertion Anti-Pattern Check**  
>
> For each regression test covering an interactive UI element, verify:
> - Is the component under test mocked and replaced with a static div/fragment?
> - Does the test assert `getByTestId('...')` on a mock marker rather than a real DOM role or attribute?
>
> If yes to both: mark as MEDIUM finding in the QA report with recommendation to remove the mock and assert the real element instead. This MEDIUM finding should be addressed before handoff to UAT unless there is a documented technical blocker (e.g., the component requires a full browser environment that jsdom cannot provide).

**Rationale**: The Code Review → QA cycle currently passes MEDIUM mock-assertion findings without acting on them. QA is better positioned than Code Review to enforce regression adequacy because QA owns the handoff gate to UAT. A MEDIUM finding at QA requires resolution rather than deferral.

---

## Change 5: UAT + DevOps mode instructions — Deferred Validation Protocol

**Target A**: UAT mode instructions (section: "Deferred Validation" or "Pre-Merge Gate")  
**Target B**: DevOps mode instructions (section: "Post-Release Actions")  
**Priority**: LOW

**UAT instruction addition**:

> **Deferred Manual Validation Protocol**  
>
> When interactive browser validation is required but cannot be executed within the pipeline (e.g., worktree session with no browser), classify it as a **post-merge obligation**, not a pre-merge gate.
>
> Use this language in the UAT report:
> > "DF-1/DF-2: Manual browser validation required. These are **post-merge validation items**. The merge to main may proceed. Validation must be recorded in `082-open-actions.md` within 48h of first production deployment."
>
> Do **not** use language like "must close before Stage 1" for items that cannot be executed within the pipeline. False pre-merge conditions create confusion and bloat open-actions trackers without corresponding resolution paths.

**DevOps instruction addition** (under "Post-Release Actions"):

> If the deployment doc references open DF-n items (deferred manual validation), record in the deployment doc:
> - The open-actions tracker file path
> - The 48h obligation window
> - The QA Team as owner for closure
>
> Do not mark the release as blocked by DF items; they are tracked as separate QA obligations.

**Rationale**: DF-1/DF-2 has appeared in 5 consecutive phase documents for Plan 082 without resolution. The item cannot be acted on within the pipeline; the pattern suggests the label "pre-merge condition" is misleading. Structural clarity about pre-merge vs post-merge obligations prevents accumulation of permanently-open action items.

---

## Application Instructions for PI Agent

1. Apply Change 1 (UAT version language) and Change 2 (DevOps pager pre-flight) **immediately** — these have the highest recurrence risk and are unambiguous, low-risk wording changes.
2. Apply Change 3 (copilot-instructions regression test rule) and Change 4 (QA adequacy gate) in the same edit pass — they are paired and each references the other.
3. Apply Change 5 (deferred validation protocol) at low priority — the current protocol is functional, just imprecise.
4. All changes are additive. No existing instructions need to be removed.
