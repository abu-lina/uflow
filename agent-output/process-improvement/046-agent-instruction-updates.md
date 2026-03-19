---
ID: 046
Origin: 046
UUID: 9d6c1b7e
Status: Active
---

# Agent Instruction Updates 046: Version Coordination + PWA Release Visibility

**Source**: `agent-output/retrospectives/closed/046-iconify-pwa-fix-retrospective.md`  
**PI analysis**: `agent-output/process-improvement/046-process-improvement-analysis.md`  
**Date**: 2026-03-19

## Summary

- **Recommendations implemented**: 5 (`P1`–`P5`)
- **Files updated**: 3 instruction files
- **Net effect**: reduces version-collision rework, prevents lockfile-related QA failures after version bumps, documents a repeatable DevOps collision procedure, makes PWA browser validation visible at release time, and standardizes authoritative version sources.

## Files Updated

- `.github/agents/planner.agent.md`
  - Added mandatory version pre-flight before assigning release numbers
  - Updated planning process to state versions conservatively until DevOps Stage 1 confirms availability
  - Added authoritative version-source policy to Version Management

- `.github/agents/implementer.agent.md`
  - Added mandatory lockfile alignment self-check after any `package.json` version bump

- `.github/agents/devops.agent.md`
  - Added authoritative version-source note to version consistency checks
  - Added Stage 1 version pre-flight against `origin/main` and tags
  - Added Stage 2 version collision resolution procedure
  - Added PWA browser verification requirements to release readiness

## Changes by Recommendation

- **P1 Planner multi-worktree version pre-flight**: ✅ Implemented
  - Planner now runs `git fetch origin --tags`, inspects recent tags, and checks `origin/main:package.json` before assigning a release number
  - Plans now state version targets conservatively until DevOps Stage 1 confirms the exact patch number

- **P2 Implementer lockfile alignment self-check**: ✅ Implemented
  - Implementer must run `npm install --package-lock-only` immediately after any `package.json` version bump
  - Implementer must verify `package-lock.json` version alignment before Code Review or QA handoff

- **P3 DevOps version collision resolution pattern**: ✅ Implemented
  - DevOps Stage 1 now confirms the target version against tags and `origin/main`
  - DevOps Stage 2 now has an explicit collision-recovery sequence with a two-bump escalation limit

- **P4 PWA deployment browser verification runbook**: ✅ Implemented
  - DevOps release-readiness flow now requires PWA manual validation items to be surfaced in the release summary when PWA surface area was touched
  - Deferred DF-N items must be referenced explicitly rather than silently omitted or duplicated

- **P5 Version-authoritative-source policy**: ✅ Implemented
  - Planner and DevOps instructions now define git tags as authoritative for released versions and `origin/main:package.json` as authoritative for development version targeting
  - Roadmap `Current Version` is explicitly documented as informational only

## Validation Plan

Monitor the next 2 to 3 release-oriented plans for:

- Planner plans that assign a version only after checking tags and `origin/main`
- Implementer handoffs that reach QA without lockfile/version mismatch findings
- DevOps Stage 1 catching version collisions before rebase/push work begins
- PWA-related releases surfacing manual browser validation items in the readiness summary instead of leaving them implicit
- Fewer agent-to-agent disagreements about whether roadmap, tags, or `package.json` is authoritative

## Related Artifacts

- Retrospective: `agent-output/retrospectives/closed/046-iconify-pwa-fix-retrospective.md`
- PI analysis: `agent-output/process-improvement/046-process-improvement-analysis.md`
- This summary: `agent-output/process-improvement/046-agent-instruction-updates.md`
