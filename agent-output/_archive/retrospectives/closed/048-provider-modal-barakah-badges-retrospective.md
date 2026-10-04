---
ID: 048
Origin: 048
UUID: 5e9ac41b
Status: Processed
---

# Retrospective 048: Provider Modal Barakah Badge Visuals

**Plan Reference**: `agent-output/planning/closed/048-provider-modal-barakah-badges.md`
**Date**: 2026-03-22
**Retrospective Facilitator**: retrospective
**Focus**: Emphasises repeatable process improvements — especially DevOps/deployment workflow lessons — over one-off technical details

## Changelog

| Date (UTC)        | Agent         | Change                                        |
| ----------------- | ------------- | --------------------------------------------- |
| 2026-03-22T12:00Z | retrospective | Created — deployment lessons capture requested |
| 2026-03-22T14:20Z | pi            | Retrospective processed; extracted P1–P6 into process-improvement analysis |

---

## Summary

**Value Statement**: As a service seeker browsing a provider in the desktop modal, I want the Barakah Effekte section to show the provider's actual badge visuals and trust signals, so that I can quickly understand what makes the provider trustworthy and Islamically relevant without seeing placeholder or legacy content.

**Value Delivered**: YES — structured `BadgeLabel` components render from `provider.badges`; `Hatem Ipsum` and legacy string pills removed; `providers.noBadges` i18n key added across 6 locales.

**Implementation Duration**: 2026-03-19 (planning) → 2026-03-22 (tag v0.8.9 pushed)

**Overall Assessment**: The feature implementation was clean and TDD-compliant. The DevOps phase required two rebase cycles and a version bump due to version collision and a concurrent branch merge — both avoidable with earlier version pre-flight and tighter worktree branch hygiene.

---

## Timeline Analysis

| Phase          | Notes                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------- |
| Planning       | 2026-03-19. Plan created targeting "next available patch after v0.8.7"; version deferred.   |
| Critique       | 2026-03-19. APPROVED with 1 MEDIUM (taxonomy mismatch, advisory). No blocking findings.   |
| Implementation | 2026-03-19. 5 milestones complete in one session. TDD cycle verified.                      |
| Code Review    | 2026-03-19. APPROVED. 2 INFO findings (duplicate test scope, badge label language scope).  |
| QA             | 2026-03-22. QA Complete. 37/37 modal, 302/320 full suite, type-check clean.                |
| UAT            | 2026-03-22. APPROVED FOR RELEASE. 6/7 scenarios PASS; 1 deferred (live URL browser check). |
| DevOps         | 2026-03-22. **Two rebase cycles, one version bump, one force-push.** See below.            |

---

## What Went Well

### Implementation Quality

- TDD cycle was clean: 3 tests written first, red verified, all 37 modal tests passing after implementation. No test-after shortcuts.
- Scope discipline held: only the Barakah Effekte section was modified; no adjacent UI was altered.
- The `t()` gotcha (returns key string as truthy fallback) was caught during implementation and documented. All 6 locale files updated correctly.
- Single canonical data source enforced: `provider.badges` only, no dual legacy+structured rendering.

### QA and UAT Efficiency

- QA verified the complete hydration path (`getProviderById` → `useProvider` → `ProviderDetailPageClient` → `ProviderDetailModal`) without requiring implementation changes.
- UAT was artifact-first and fast: all prerequisite documents read in parallel; verdict issued without back-and-forth.
- Deferred item (live URL browser check) was correctly scoped as non-blocking and handed to DevOps as a post-deployment gate.

### DevOps Conflict Resolution

- CHANGELOG conflict structure was understood correctly on both rebase occasions: `[0.8.10]` first (newer, from main), then `[0.8.9]` (ours), both preserved.
- Python script files (`/tmp/*.py`) written via file tool proved reliable for multi-line text operations where shell heredocs fail due to special characters in markdown tables.

---

## What Didn't Go Well — Deployment Lessons

### D1 — Version collision caused by stale branch base (HIGH IMPACT, REPEATABLE)

**What happened**: The branch `session/048-barakah-badges` was cut from `59036f7` (origin/main at planning time). The implementer bumped `package.json` to `0.8.8` at M5 (implementation phase). By the time DevOps Stage 1 ran three days later, `v0.8.8` had been published to origin via Plan 047 + a prior Plan 048 session. The version had to be bumped to `0.8.9` at Stage 1.

**Root cause**: M5 version bump during implementation uses a speculative version that has not been validated at branch-creation time. Origin moved forward between implementation and DevOps.

**Improvement**: Version pre-flight (`git fetch --tags` + comparison) is already documented as mandatory at DevOps Stage 1. The process worked as designed — the collision was caught and resolved. However, the M5 instruction in plan templates still says "bump to X.Y.Z" rather than "propose; confirm at Stage 1." **Update plan templates to state version as a placeholder at M5 and confirm at Stage 1.**

---

### D2 — Plan ID collision between sessions (MEDIUM IMPACT, REPEATABLE)

**What happened**: A prior session had used Plan ID `048` for the JoinHalal Admin Dry-Run Dashboard UI. This session also used Plan ID `048` for the Barakah badges plan. At rebase time, `agent-output/planning/048-open-actions.md` was an add/add conflict because two independent sessions had created files with the same name.

**Root cause**: The `.next-id` file was not incremented between sessions or was reset. Both originated as fresh plans from user requests (not downstream from analysis), but the planner agents read the same `.next-id` value.

**Improvement**: Before creating any new plan, the planner agent must verify the ID does not already exist in `agent-output/planning/` (including `closed/`). If it does, read `.next-id`, increment, and write back. The `.next-id` check should also scan `closed/` to prevent reuse of IDs from archived sessions.

---

### D3 — Post-commit formatter changes required amend before push (LOW IMPACT, REPEATABLE)

**What happened**: After the Stage 1 commit (`135dd9a`), VS Code's formatter reformatted `ProviderDetailModal.tsx` (collapsed a 4-line Lucide import to 1 line) and re-aligned markdown table columns in three agent-output files. These unstaged changes blocked the rebase and had to be folded into the commit via `git commit --amend --no-edit` before proceeding.

**Root cause**: Code formatters run automatically on open/save and can change files that were already committed, creating post-commit working tree noise.

**Improvement**: Before running `git rebase`, always check `git diff --name-only` and stash or amend any formatter-only changes. This is already standard practice; document it explicitly in the DevOps Stage 2 checklist as: "Amend formatter-only changes before rebase."

---

### D4 — Two rebase cycles needed due to concurrent plan merge (MEDIUM IMPACT, SITUATIONAL)

**What happened**: Plan 049 (JoinHalal dry-run timeout hardening, `v0.8.10`) was merged to `main` while Stage 2 was in progress. After tagging `v0.8.9` and pushing the branch, the GitHub PR showed a merge conflict. A second `git rebase origin/main` + `git push --force-with-lease` was required.

**Root cause**: Short release cadence (multiple plans merging on the same day). Our branch was pushed but the PR was opened after another plan had already merged.

**Improvement**: Open the PR immediately after the first branch push (Stage 2 step), so GitHub can start CI and the conflict is visible early rather than discovered by the user. The PR description can be written after the force-push if a rebase is needed. **Add "Open PR immediately after first push" to Stage 2 checklist, before tagging.**

---

### D5 — Shell heredocs corrupted by special characters in markdown table content (LOW IMPACT, REPEATABLE)

**What happened**: Three separate attempts to write markdown files via shell `cat <<'ENDOFFILE'` heredocs failed because the pipe character (`|`) in table rows, combined with the heredoc terminator detection, caused the shell to enter a broken quote state. Subsequent commands in the same terminal session were corrupted until `reset` was called.

**Root cause**: Markdown table syntax (`| cell |`) triggers heredoc parsing issues in certain shell states. This is a known fragility with inline heredocs when content includes pipe characters and variable-like strings.

**Improvement**: Never use shell heredocs to write markdown files with table content. Prefer: (a) the `create_file` tool for new files, (b) Python scripts written via `create_file` to `/tmp/` and executed by name. Both approaches proved reliable throughout this session. Document this as a firm rule: **"Use Python scripts or the file creation tool for multi-line markdown. Never heredoc."**

---

### D6 — PR not immediately visible after push (LOW IMPACT, INFORMATIONAL)

**What happened**: After `git push origin session/048-barakah-badges`, the GitHub "create a pull request" banner had already expired by the time the user checked. The user reported not seeing the PR.

**Root cause**: GitHub's create-PR banner times out after a few minutes. The user was not watching the terminal output when the push completed.

**Improvement**: After every branch push, explicitly surface the PR creation URL in the agent response. Format: `https://github.com/<org>/<repo>/compare/main...<branch>`. Do not rely on GitHub's banner.

---

## Agent Output Analysis

### Phase Sequence

```
Planner → Critic → Implementer → Code Reviewer → QA → UAT → DevOps (Stage 1) → DevOps (Stage 2) → Retrospective
```

### Key Handoff Points and Quality

| From → To | Quality | Notes |
|-----------|---------|-------|
| Planner → Critic | GOOD | Plan well-formed; critique added F1 taxonomy advisory (accepted by plan) |
| Critic → Implementer | GOOD | Clear acceptance criteria; F1 advisory documented in Decision Record |
| Implementer → Code Reviewer | GOOD | TDD table complete; 3 new tests + 3 updated; gotcha documented |
| Code Reviewer → QA | GOOD | 2 INFO findings, no required actions, clean handoff |
| QA → UAT | GOOD | All gates verified; single deferred item clearly scoped |
| UAT → DevOps | GOOD | APPROVED FOR RELEASE verdict clear; deferred item handed to DevOps |
| DevOps | REQUIRED REWORK | Two rebase cycles, version bump, force-push. All resolved but added friction |

### Issues Resolved During DevOps

| Issue | Cause | Resolution | Time Cost |
|-------|-------|------------|-----------|
| Version collision `v0.8.8` existed | Concurrent plan merged between implementation and DevOps | Bumped to `0.8.9` | 10 min |
| Plan ID `048` add/add conflict | Prior session used same ID | Merged both sessions' open-action trackers | 5 min |
| Formatter changes blocked rebase | Auto-formatter ran post-commit | Amend before rebase | 5 min |
| Plan 049 merge conflict in PR | Concurrent merge to main during Stage 2 | Second rebase + force-push | 10 min |
| Heredoc shell corruption (×3) | Markdown pipe chars in heredoc | Python script via file tool | 5 min each |

---

## Process Improvement Recommendations

Ranked by impact × frequency:

### P1 — Plan templates: version as placeholder, not speculative bump (HIGH)
Change M5 template wording from "bump version to X.Y.Z" to "propose version bump; exact version confirmed at DevOps Stage 1 via `git fetch --tags` pre-flight." The current collision-resolution procedure already handles this, but the mis-set expectation adds confusion and requires changelog corrections.

### P2 — Planner: scan `closed/` before allocating new ID (HIGH)
Add to planner instructions: before allocating a plan ID from `.next-id`, check that the ID does not already exist in any `agent-output/*/closed/` directory. If it does, increment and write back before use. Both the `.next-id` file and the `closed/` directories are truth sources for ID uniqueness.

### P3 — DevOps Stage 2: open PR before tagging (MEDIUM)
Reorder Stage 2 checklist: (1) push branch, (2) open PR immediately, (3) tag. This surfaces merge conflicts via GitHub CI before the tag is created and avoids the post-tag force-push pattern.

### P4 — DevOps Stage 2: surface PR URL in response (MEDIUM)
After every branch push, include the PR creation URL explicitly in the agent response. Do not depend on GitHub's transient create-PR banner.

### P5 — Agent tooling: prohibit shell heredocs for markdown (LOW)
Add to agent coding standards: use Python scripts or the `create_file` tool for any multi-line file write that contains markdown table content. Never use shell heredocs after this session has demonstrated their fragility.

### P6 — DevOps Stage 2 checklist: amend formatter changes before rebase (LOW)
Explicit checklist item: after `git diff --name-only` check, if any files have formatter-only changes (whitespace, import style), amend them into the Stage 1 commit before running `git rebase`.

---

## Successes Worth Repeating

- **Python-via-file-tool pattern**: Write resolution logic to `/tmp/script.py` using the `create_file` tool, then execute by filename. Reliable for any multi-line operation that would corrupt a heredoc.
- **Explicit staged-set inspection**: `git diff --cached --name-only` + `git diff --check` before every rebase and commit prevented silent commit of conflict markers.
- **Concurrent conflict merging**: When two sessions both create the same file (add/add conflict), merge both bodies preserving all deferred items. Don't drop one side.
- **Systematic conflict resolution order**: CHANGELOG first (verify visually), then package.json, then package-lock.json. Prevents version inconsistency across the three files.

---

## Deferred Post-Release Items

As documented in `agent-output/planning/048-open-actions.md`:

| Item | Owner | Status |
|------|-------|--------|
| Browser visual verification of UAT provider URL (`be186e0a`) | DevOps / UAT operator | Open — pending deployment |
| JoinHalal admin dashboard post-deploy validations (4 items from prior Plan 048 session) | DevOps / Engineering | Open |
| Dependabot 2 HIGH + 2 moderate alerts on `origin/main` | Security / Engineering | Unrelated to Plan 048; requires separate remediation plan |

---

## Next Actions

- **PI agent**: Extract P1–P6 process improvements into persistent agent instructions
- **Planner**: Apply P1 (version placeholder) and P2 (ID scan `closed/`) immediately in the next plan
- **DevOps operator**: Complete deferred browser check at UAT URL post-deployment
