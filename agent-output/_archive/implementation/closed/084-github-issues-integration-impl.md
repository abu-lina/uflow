---
ID: 084
Origin: 084
UUID: e7a2c9f1
Status: Committed
---

# Implementation — Plan 084: GitHub Issues Integration for Workflow Pipeline

| Field          | Value                                                              |
| -------------- | ------------------------------------------------------------------ |
| Plan Reference | `agent-output/planning/084-github-issues-integration-plan.md`      |
| Critique       | `agent-output/critiques/084-github-issues-integration-critique.md` |
| Date           | 2026-04-06                                                         |
| Implementer    | GitHub Copilot (Claude Sonnet 4.6)                                 |

## Changelog

| Date              | Handoff               | Request                 | Summary                       |
| ----------------- | --------------------- | ----------------------- | ----------------------------- |
| 2026-04-06T16:00Z | Planner → Implementer | Plan approved — proceed | Implementation started        |
| 2026-04-06T16:30Z | Implementer           | All milestones complete | Ready for Code Review handoff |

---

## Value Statement Validation

**Original**: "As a workflow agent and project maintainer, I want to automatically create GitHub Issues when a plan is created, with labels matching the Orchestrator's task classification, so that all work-in-progress is visible on GitHub Issues and each plan has a canonical external tracking URL."

**This implementation delivers**: Planner agent instructions create a GitHub Issue via `gh issue create --body-file` on plan finalization; DevOps Stage 2 closes the issue on release; 7 custom labels provide consistent classification; 5 YAML issue form templates serve manual issue creation; bidirectional plan ↔ issue linking via the new `GitHub Issue` header field.

---

## Implementation Summary

All changes are to agent instruction `.md` files, YAML issue templates, and the CHANGELOG. Zero runtime code changes, zero migrations, zero dependencies added.

---

## Milestones Completed

- [x] M-1: 7 GitHub labels created on `abu-lina/uflow`
- [x] M-2: Planner agent updated with GitHub Issue Creation section
- [x] M-3: Orchestrator Workflow Card Type field updated to include all 6 classifications
- [x] M-4: DevOps Stage 2 updated with Close GitHub Issues step (step 4, Phase 2D)
- [x] M-5: Plan header template updated with `GitHub Issue` field
- [x] M-6: CHANGELOG entry added under `[Unreleased]`
- [x] M-7: 5 YAML issue form templates + config.yml created in `.github/ISSUE_TEMPLATE/`

---

## Files Modified

| Path                                                          | Changes                                                                                                                                                 | Lines   |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| `.github/agents/planner.agent.md`                             | Added plan header table (M-5) + GitHub Issue Creation section (M-2) with duplicate check, label mapping, `--body-file` pattern, and back-reference step | +80     |
| `.github/agents/orchestrator.agent.md`                        | Workflow Card Type field updated to include `Verification\|Security Audit` (M-3)                                                                        | +1 / -1 |
| `.github/agents/devops.agent.md`                              | Step 4 in Phase 2D: Close GitHub Issues for released plans (M-4); renumbered subsequent steps 5→5, old 5→6, old 6→7, old 6b→7b                          | +25     |
| `CHANGELOG.md`                                                | Added `[Unreleased]` entry describing Plan 084 (M-6)                                                                                                    | +8      |
| `agent-output/.next-id`                                       | Incremented from 84 → 85                                                                                                                                | +1 / -1 |
| `agent-output/planning/084-github-issues-integration-plan.md` | Status updated to In Progress; changelog entries added                                                                                                  | +3      |

## Files Created

| Path                                                                | Purpose                                                                                                             |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `.github/ISSUE_TEMPLATE/feature.yml`                                | Feature request template — auto-applies `type:feature`, `plan`                                                      |
| `.github/ISSUE_TEMPLATE/bugfix.yml`                                 | Bug report template — auto-applies `type:bugfix`, `plan`                                                            |
| `.github/ISSUE_TEMPLATE/refactor.yml`                               | Refactor request template — auto-applies `type:refactor`, `plan`                                                    |
| `.github/ISSUE_TEMPLATE/hotfix.yml`                                 | Urgent production issue template — auto-applies `type:hotfix`, `plan`; includes urgency warning                     |
| `.github/ISSUE_TEMPLATE/security.yml`                               | Security issue template — auto-applies `type:security`, `plan`; lists OWASP categories; references private advisory |
| `.github/ISSUE_TEMPLATE/config.yml`                                 | Template chooser config — blank issues enabled; links to docs and private advisory                                  |
| `agent-output/implementation/084-github-issues-integration-impl.md` | This document                                                                                                       |

## Out-of-Repo Changes (M-1)

| Resource                         | Change          | Verified via    |
| -------------------------------- | --------------- | --------------- |
| GitHub label `type:feature`      | Created #a2eeef | `gh label list` |
| GitHub label `type:bugfix`       | Created #d73a4a | `gh label list` |
| GitHub label `type:refactor`     | Created #fbca04 | `gh label list` |
| GitHub label `type:hotfix`       | Created #e11d48 | `gh label list` |
| GitHub label `type:verification` | Created #0e8a16 | `gh label list` |
| GitHub label `type:security`     | Created #b60205 | `gh label list` |
| GitHub label `plan`              | Created #5319e7 | `gh label list` |

---

## TDD Compliance

No new functions or classes created. All changes are to `.md` agent instruction files, YAML configuration templates, and the CHANGELOG. There is no executable code surface to apply the TDD gate to.

| Artifact                                           | Type                          | Test Written First?      | Notes                                                    |
| -------------------------------------------------- | ----------------------------- | ------------------------ | -------------------------------------------------------- |
| `planner.agent.md` — GitHub Issue Creation section | Agent instructions (markdown) | N/A — no executable code | Verified by manual inspection of instruction correctness |
| `orchestrator.agent.md` — Type field update        | Agent instructions (markdown) | N/A                      | One-line addition verified by reading the updated file   |
| `devops.agent.md` — Close GitHub Issues step       | Agent instructions (markdown) | N/A                      | Verified correct placement and step numbering            |
| `.github/ISSUE_TEMPLATE/*.yml`                     | GitHub YAML form templates    | N/A — YAML config        | Verified against GitHub issue form syntax spec           |
| GitHub labels (7)                                  | Remote resource               | N/A                      | Verified via `gh label list` output (17 labels total)    |

**Manual verification required** (QA gate): After commit, QA/UAT should create a test plan and confirm:

1. A GitHub Issue is created with correct title, body, and labels
2. Issue URL appears in plan header
3. The 5 templates render on `github.com/abu-lina/uflow/issues/new/choose`

---

## Code Quality Validation

| Gate                 | Result                                                                          |
| -------------------- | ------------------------------------------------------------------------------- |
| `npm run type-check` | ✅ PASS — 0 errors                                                              |
| `npm run lint`       | ✅ PASS — 0 errors, 18 pre-existing warnings (unchanged)                        |
| `npm test` (vitest)  | N/A — no runtime code changed; existing test suite unaffected                   |
| `npm run build`      | Deferred — no source code changes; build cannot be affected by `.md` file edits |

---

## Assumptions Documented

1. `gh` CLI remains authenticated (macOS keyring). Agent instructions are conditional — if auth expires, the agent surfaces the error to the user and skips issue creation.
2. Issue templates will be rendered by GitHub's issue form renderer when pushed to `main`. Local validation not possible without a push.
3. Label colours are cosmetic; exact hex values may be adjusted by the maintainer without functional impact.

---

## Outstanding Items

None. All milestones complete. No deferred items, no blockers.

---

## Next Steps

→ Code Review: review agent instruction clarity and YAML template correctness
→ QA: manual verification — create a test plan and confirm GitHub Issue is created with correct labels and back-reference
→ UAT: user confirms Issue appears on GitHub with correct template and labels
