---
ID: 048
Origin: 048
UUID: 5e9ac41b
Status: Active
---

# Process Improvement Analysis 048: DevOps Deployment Workflow

**Source Retrospective**: `agent-output/retrospectives/closed/048-provider-modal-barakah-badges-retrospective.md`
**Date**: 2026-03-22
**Analyst**: ProcessImprovement

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-03-22T14:00Z | pi | Created — conflict analysis for P1–P6 |
| 2026-03-22T14:20Z | pi | Approved updates implemented; source retrospective closed |

---

## Executive Summary

- **Recommendations analyzed**: 6 (P1–P6)
- **High impact**: 2 (P1, P2)
- **Medium impact**: 2 (P3, P4)
- **Low impact**: 2 (P5, P6)
- **Conflicts found**: 1 (P1 vs implementer instruction 13)
- **Pure additions**: 4 (P2, P4, P5, P6)
- **Reordering**: 1 (P3)
- **Overall risk**: LOW — all changes are additive or clarifying; none remove existing guardrails
- **Recommendation**: Implement all 6; P1+P2 first (high impact), P3+P4 second, P5+P6 last

---

## Recommendation Analysis

### P1 — Plan templates: version as placeholder, not speculative bump (HIGH)

**Source**: Retrospective D1 — version collision caused by stale branch base

**Current state**:
- `planner.agent.md` Core Responsibility 5e: **Already says** "State the target version as: _'next available patch after current `origin/main` version; confirm at DevOps Stage 1'_ rather than a hard-coded number."
- `planner.agent.md` Process step 4: **Already says** "State version conservatively as 'next available after current origin/main version; confirm at DevOps Stage 1'"
- `implementer.agent.md` item 13: "Execute version updates (package.json, CHANGELOG, etc.) when plan includes milestone. Don't defer to DevOps."

**Alignment**: Planner instructions are already correct. The **gap** is in the implementer — instruction 13 does not acknowledge that the plan version is preliminary. The implementer bumps to whatever number appears in the plan without noting it may change at DevOps Stage 1.

**Affected agents**: Implementer
**Risk**: LOW — additive clarification to an existing instruction

**Proposed change** (implementer.agent.md, item 13):

BEFORE:
```
13. Execute version updates (package.json, CHANGELOG, etc.) when plan includes milestone. Don't defer to DevOps.
```

AFTER:
```
13. Execute version updates (package.json, CHANGELOG, etc.) when plan includes milestone. Don't defer to DevOps.
   13c. **Version bump is preliminary (MANDATORY)**: The version number in the plan is a placeholder until DevOps Stage 1 confirms it via `git fetch --tags`. When bumping, note in the implementation doc: "Version bumped to X.Y.Z (preliminary — final version confirmed at DevOps Stage 1)." Do not treat the plan's version as immutable.
```

---

### P2 — Planner: scan `closed/` before allocating new ID (HIGH)

**Source**: Retrospective D2 — Plan ID collision between sessions

**Current state**:
- `document-lifecycle` SKILL.md: ID Assignment Rules say "Read `.next-id`, increment, use as ID, write back" — no check for existing files with that ID.
- `planner.agent.md`: No instruction to verify ID uniqueness beyond `.next-id`.

**Alignment**: Pure addition. No conflict with existing instructions.

**Affected agents**: Document-lifecycle skill (consumed by all originating agents), Planner, Analyst
**Risk**: LOW — adds a verification step without removing anything

**Proposed change 1** (document-lifecycle SKILL.md, under "ID Assignment Rules"):

ADD after the "Rules" list:
```
### Pre-Allocation Verification (MANDATORY)

Before using a new ID from `.next-id`, verify no file already exists with that ID:

```bash
# Check all agent-output directories (including closed/)
find agent-output/ -name "${NEXT_ID}-*" -type f 2>/dev/null
```

If any file is found:
1. Increment `.next-id` and repeat the check
2. Continue until a truly unused ID is found
3. Write the final next value back to `.next-id`

This prevents ID collisions when multiple worktrees or sessions read `.next-id` concurrently.
```

**Proposed change 2** (planner.agent.md, Process step before current step 1):

ADD as new step in Process section:
```
0b. **ID collision check (MANDATORY)**: Before allocating a plan ID from `.next-id`, verify the ID is not already in use: `find agent-output/ -name "${ID}-*" -type f 2>/dev/null`. If matches exist, increment and re-check. See `document-lifecycle` skill Pre-Allocation Verification.
```

---

### P3 — DevOps Stage 2: open PR before tagging (MEDIUM)

**Source**: Retrospective D4 — two rebase cycles due to concurrent plan merge

**Current state**:
- `devops.agent.md` Phase 2C: "1. Tag... 2. Push all commits... 3. Publish..."
- Current order: tag → push → publish

**Alignment**: Reordering. The current flow creates a tag before the PR exists, so merge conflicts are discovered only after the tag is pushed. The proposed flow surfaces conflicts earlier.

**Affected agents**: DevOps
**Risk**: MEDIUM — changes the ordering of tag and push; agents must adapt to the new sequence

**Proposed change** (devops.agent.md, Phase 2C):

BEFORE:
```
1. Tag: `git tag -a v[X.Y.Z] -m "Release v[X.Y.Z] - [plan summaries]"`, push tag.
2. Push all commits: `git push origin [branch]`.
3. Publish: vsce/npm/twine/GitHub (environment-specific).
```

AFTER:
```
1. Push branch: `git push origin [branch]`.
2. Surface the PR creation URL in the response (see P4 below).
3. Verify no merge conflicts in the PR comparison. If conflicts exist, rebase onto `origin/main`, resolve, and force-push (`--force-with-lease`) before proceeding.
4. Tag: `git tag -a v[X.Y.Z] -m "Release v[X.Y.Z] - [plan summaries]"`, push tag.
5. Publish: vsce/npm/twine/GitHub (environment-specific).
```

---

### P4 — DevOps Stage 2: surface PR URL in response (MEDIUM)

**Source**: Retrospective D6 — PR not immediately visible after push

**Current state**: No mention of PR URLs in devops.agent.md.

**Alignment**: Pure addition. Complements P3.

**Affected agents**: DevOps
**Risk**: LOW — additive

**Proposed change** (devops.agent.md, Phase 2C, after push step):

ADD:
```
   1b. **Surface PR URL (MANDATORY)**: After every branch push, include the PR comparison URL in the agent response:
   `https://github.com/<org>/<repo>/compare/main...<branch>`
   Do not rely on GitHub's transient "create a pull request" banner.
```

---

### P5 — Agent tooling: prohibit shell heredocs for markdown (LOW)

**Source**: Retrospective D5 — shell heredocs corrupted by markdown table pipes

**Current state**:
- `devops.agent.md` "Commit message reliability" section: "Do NOT use heredocs or multi-paragraph `git commit -m ...` (shell quoting is fragile)." — but this is **specific to commit messages**, not general markdown writes.
- `devops.agent.md` "Shell safety (MANDATORY)": Covers quoting paths with parentheses. Does not cover heredocs.

**Alignment**: Broadens an existing narrow rule. No conflict.

**Affected agents**: DevOps (primary), Implementer, any agent writing files via terminal
**Risk**: LOW — additive rule

**Proposed change** (devops.agent.md, under "Shell safety (MANDATORY)"):

ADD after the existing shell safety bullets:
```
- **Never use shell heredocs for markdown** (`cat <<EOF ... EOF` or `cat <<'EOF' ... EOF`): Markdown table syntax (`| cell |`) corrupts heredoc parsing and can break the terminal session. Use: (a) the `create_file` tool for new files, (b) Python scripts written to `/tmp/` via `create_file` and executed by filename for complex text transformations.
```

---

### P6 — DevOps Stage 2 checklist: amend formatter changes before rebase (LOW)

**Source**: Retrospective D3 — post-commit formatter changes required amend before push

**Current state**:
- `devops.agent.md` Phase 2A step 5: "Check workspace: All plan commits present, no uncommitted changes." — states the goal but not the remediation for formatter-only changes.

**Alignment**: Extends an existing check with an explicit remediation step. No conflict.

**Affected agents**: DevOps
**Risk**: LOW — additive

**Proposed change** (devops.agent.md, Phase 2A, after step 5):

ADD as step 5b:
```
  5b. **Amend formatter-only changes (MANDATORY if detected)**: Run `git diff --name-only`. If files have uncommitted changes, inspect them. If all are formatter-only (whitespace, import reordering, markdown table alignment), amend into the most recent commit: `git commit -a --amend --no-edit`. If any contain logic changes, stop and investigate before proceeding.
```

---

## Conflict Analysis

| # | Recommendation | Conflicting Instruction | Nature | Impact | Resolution |
|---|---|---|---|---|---|
| C1 | P1: version placeholder | Implementer 13: "Execute version updates... Don't defer to DevOps." | Clarification needed | LOW: implementer may bump to a stale version | Add 13c sub-instruction clarifying the bump is preliminary. The "don't defer to DevOps" intent is preserved — the implementer still bumps, but notes it's preliminary. |

No other conflicts found. P2, P3, P4, P5, P6 are pure additions or reorderings with no contradictions.

---

## Logical Challenges

### LC1 — P3 tag ordering: tag before or after PR merge?

**Issue**: P3 says "push branch → open PR → tag." But UFlow's current flow pushes a feature branch, not directly to main. The tag should be on the final merged commit (on main), not on the feature branch commit.

**Proposed solution**: The tag is created on the feature branch before merge. After merge, the tag remains valid (it points to the commit that was merged). If a rebase occurs between push and merge, the tag must be re-created. Add a note: "If a post-push rebase is required, delete and re-create the tag on the new HEAD before force-pushing."

### LC2 — P2 scan performance with large `closed/` directories

**Issue**: As the project matures, `find agent-output/ -name "${ID}-*"` may scan many files.

**Proposed solution**: This is negligible in practice — agent-output is small (hundreds of files at most). The scan takes <1 second. No optimization needed.

---

## Risk Assessment

| Recommendation | Risk Level | Rationale | Mitigation |
|---|---|---|---|
| P1 — Version placeholder | LOW | Adds a sub-instruction; doesn't change behavior direction | Monitor next 3 plans for version bump clarity |
| P2 — Scan closed/ for ID | LOW | Purely additive verification | Monitor next plan ID allocation for false positives |
| P3 — PR before tag | MEDIUM | Reorders established release steps | Document LC1 tag recreation scenario in the instruction |
| P4 — Surface PR URL | LOW | Additive display requirement | N/A |
| P5 — No heredocs for md | LOW | Broadens existing narrow rule | N/A |
| P6 — Amend formatter changes | LOW | Additive remediation step | N/A |

---

## Implementation Recommendations

### Tier 1: High-Impact, Low-Risk (implement first)

- **P1**: Add `13c` to `implementer.agent.md`
- **P2**: Add Pre-Allocation Verification to `document-lifecycle` SKILL.md + step `0b` to `planner.agent.md`

### Tier 2: Medium-Impact, Low-to-Medium Risk

- **P3**: Reorder Phase 2C in `devops.agent.md` (branch push → PR → tag)
- **P4**: Add PR URL surfacing to `devops.agent.md`

### Tier 3: Low-Impact, Low-Risk

- **P5**: Add heredoc prohibition to `devops.agent.md` shell safety section
- **P6**: Add formatter amend step to `devops.agent.md` Phase 2A

---

## Files to Update

| File | Recommendations | Change Type |
|---|---|---|
| `.github/agents/implementer.agent.md` | P1 | Add sub-instruction 13c |
| `.github/skills/document-lifecycle/SKILL.md` | P2 | Add Pre-Allocation Verification section |
| `.github/agents/planner.agent.md` | P2 | Add ID collision check step |
| `.github/agents/devops.agent.md` | P3, P4, P5, P6 | Reorder Phase 2C; add PR URL, heredoc rule, formatter amend step |

---

## User Decision Required

1. **Implement all 6 now** — update all 4 files in one batch
2. **Review proposed text first** — I'll show exact before/after diffs for each file
3. **Phased rollout** — Tier 1 now, Tier 2+3 after next release validates
4. **Defer** — archive analysis, apply later

Please confirm your choice.

---

## Related Artifacts

- Retrospective: `agent-output/retrospectives/closed/048-provider-modal-barakah-badges-retrospective.md`
- Plan: `agent-output/planning/closed/048-provider-modal-barakah-badges.md`
- Deployment doc: `agent-output/deployment/v0.8.9.md`
- Planner agent: `.github/agents/planner.agent.md`
- Implementer agent: `.github/agents/implementer.agent.md`
- DevOps agent: `.github/agents/devops.agent.md`
- Document-lifecycle skill: `.github/skills/document-lifecycle/SKILL.md`
