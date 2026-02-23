---
ID: 010
Origin: 010
UUID: 3f8a1c2d
Status: Resolved
---

# Agent Instruction Updates 010 — Implementing PI 010 (Recommended Minimal Deltas)

**Source analysis**: `agent-output/process-improvement/closed/010-process-improvement-analysis.md`
**Source retrospective**: `agent-output/retrospectives/closed/010-nextjs-app-router-refactor-retrospective.md`
**Date**: 2026-02-23

## Summary

- **Option implemented**: Recommended minimal deltas (R2 + R3)
- **Files updated**: 2 agent instruction files
- **Scope**: Instruction-only changes (no source code/tests)
- **Recommendations implemented**:
  - ✅ R2: DevOps commit message reliability guidance (`git commit -F <msgfile>` preferred for multi-line messages)
  - ✅ R3: QA + DevOps shell-safety guidance (quote file paths; avoid zsh globbing failures on App Router route-group paths)

## Files Updated

- `.github/agents/devops.agent.md`
  - Added **Shell safety (MANDATORY)** guidance to quote paths like `src/app/(public)/...` to avoid `zsh: no matches found`.
  - Added **Commit message reliability note (RECOMMENDED)** to prefer `git commit -F <path>` for multi-line commit messages.

- `.github/agents/qa.agent.md`
  - Added **Shell safety (MANDATORY)** guidance to quote paths like `src/app/(public)/...` to avoid zsh globbing failures during test/lint commands.

## Validation Plan

1. Next DevOps Stage 1 commit: use `git commit -F <msgfile>` when message has multiple paragraphs; confirm no shell-quoting failures.
2. Next QA run: if commands touch App Router route-group paths, confirm quoting prevents `zsh: no matches found`.

## Related Artifacts

- PI analysis: `agent-output/process-improvement/closed/010-process-improvement-analysis.md`
- Source retrospective: `agent-output/retrospectives/closed/010-nextjs-app-router-refactor-retrospective.md`
