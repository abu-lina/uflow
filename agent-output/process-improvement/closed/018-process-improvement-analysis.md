---
ID: 018
Origin: 018
UUID: 3f2a9c1d
Status: Resolved
---

# PI-018: Process Improvements from Retro 017 (v0.6.2 + hotfix v0.6.3)

## Executive Summary

- **Source retrospective**: [agent-output/retrospectives/closed/017-i18n-header-and-hotfix-retrospective.md](../retrospectives/closed/017-i18n-header-and-hotfix-retrospective.md)
- **Trigger incident**: v0.6.2 release passed QA/UAT but broke `/providers` default view; emergency hotfix v0.6.3 restored service.
- **Top root causes (process-level)**:
  - DevOps verification relied on health checks, not functional smoke tests.
  - QA/UAT scenarios didn’t explicitly cover SSR/server-component defaults ("no URL params").
  - Sentinel refactor completeness verification wasn’t structured.
  - TDD compliance rules (agent instructions) don’t cleanly cover bugfix regression tests.
- **Recommendations (4)**: Deployment smoke tests, SSR-default verification, Sentinel-refactor checklist, Bugfix-TDD compliance clarification.
- **Overall risk**: LOW→MEDIUM (doc-only changes; risk is over-blocking or ambiguous gates).

## Changelog

| Date | Action | Summary |
| --- | --- | --- |
| 2026-02-23 | Analysis created | Extracted R1–R4 from Retro 017; validated against current agent instructions; prepared implementation templates |
| 2026-02-23 | Updates applied | Implemented R1–R4 across DevOps/QA/Implementer agent instructions; created PI update summary |

## Changelog Pattern Analysis

### Documents reviewed

- Retro: [agent-output/retrospectives/closed/017-i18n-header-and-hotfix-retrospective.md](../retrospectives/closed/017-i18n-header-and-hotfix-retrospective.md)
- QA: [agent-output/qa/closed/017-i18n-header-translation-qa.md](../qa/closed/017-i18n-header-translation-qa.md)
- UAT: [agent-output/uat/closed/017-i18n-header-translation-uat.md](../uat/closed/017-i18n-header-translation-uat.md)
- DevOps Stage 2: [agent-output/deployment/017-stage2-release-v0.6.2.md](../deployment/017-stage2-release-v0.6.2.md)
- Hotfix doc: [agent-output/deployment/hotfix-v0.6.3.md](../deployment/hotfix-v0.6.3.md)
- Agent instructions:
  - [.github/agents/devops.agent.md](../../.github/agents/devops.agent.md)
  - [.github/agents/qa.agent.md](../../.github/agents/qa.agent.md)
  - [.github/agents/implementer.agent.md](../../.github/agents/implementer.agent.md)
  - [.github/agents/uat.agent.md](../../.github/agents/uat.agent.md)

### Repeatable handoff patterns

| Pattern | Frequency (Retro 017) | Root cause | Impact | Improvement |
|---|---:|---|---|---|
| Health-check-only verification | 1 | Stage 2 checklist lacks functional smoke tests | Critical incident escaped to prod | Add minimal functional smoke tests to DevOps Stage 2 |
| Client-path-only validation | 1 | QA/UAT scenarios did not force SSR default-path coverage | Missed server component default bug | Add SSR default scenario requirement in QA/UAT |
| Sentinel refactor incomplete adoption | 1 | No structured grep/checklist across code paths | Missed `providers/page.tsx` default | Add sentinel refactor checklist + grep patterns |
| TDD gate ambiguity for bugfixes | 1 | Instructions require ✅ "Test Written First" always | Gate disagreements / rework risk | Define bugfix-regression exception format |

## Recommendation Analysis

### R1 — DevOps: Add functional smoke tests to Stage 2 verification

- **Source**: Retro 017 (“Deployment verification insufficient”) + hotfix doc (“health check passed but /providers broken”).
- **Current state**: DevOps Stage 2 in [.github/agents/devops.agent.md](../../.github/agents/devops.agent.md) requires health checks and generic “Verify success”, but does not specify functional smoke tests.
- **Proposed change**: Add a short “Functional Smoke Tests (MANDATORY)” subsection under Stage 2 Phase 2C/2D.
- **Affected agents**: DevOps
- **Risk**: LOW (adds checks; could add minor time).
- **Implementation template (text to add)**:

```markdown
**Functional Smoke Tests (MANDATORY)**

After deployment reports success (and before declaring Stage 2 complete), run 2–3 functional smoke checks that cover server-rendered defaults:

- Visit `/providers` with **no query params** and confirm results render (not “No results found”).
- Visit `/` and confirm the primary search UI renders.

Prefer an automated check when possible, but manual is acceptable:
- Manual: load pages in browser.
- Automated (example): `curl -fsS https://ummahflow.com/api/health` plus one HTML check for `/providers`.

If smoke checks fail: stop and treat as release failure; prepare hotfix or rollback.
```

### R2 — QA: Require SSR/server-default-path validation when relevant

- **Source**: Retro 017 (“QA tested client path only”).
- **Current state**: QA agent emphasizes unit/integration/e2e but does not explicitly require SSR default-path checks for Next.js server components.
- **Proposed change**: Add a conditional checklist item in QA Phase 2 (post-implementation) for server components / pages with `searchParams`/URL-driven defaults.
- **Affected agents**: QA
- **Risk**: LOW→MEDIUM (may increase manual validation scope; should be conditional).
- **Implementation template**:

```markdown
**SSR / Server-Defaults Check (MANDATORY when applicable)**

If the change touches URL param parsing, “sentinel” values (e.g., *all locations*), or any Next.js Server Component page that reads `searchParams`:

- Test the page with **no URL params** (server defaults apply).
- Test with legacy URL params (if backward compatibility is claimed).
- Test with the normal UI path (client behavior).

Document the exact URLs tested.
```

### R3 — Implementer + QA: Sentinel refactor checklist (completeness verification)

- **Source**: Retro 017 (“Incomplete grep / missed server component default”).
- **Current state**: No standard “sentinel refactor” verification steps; relies on ad-hoc search.
- **Proposed change**: Add a short checklist to Implementer (during implementation) and QA (during review) for any change that replaces a canonical sentinel value.
- **Affected agents**: Implementer, QA (optional: Planner/UAT later)
- **Risk**: LOW (process-only, conditional).
- **Implementation template**:

```markdown
**Sentinel Refactor Checklist (WHEN APPLICABLE)**

If you change a canonical sentinel (example: “Everywhere/Überall” → `''`):

- Identify all entry points (SSR pages, client components, services) that set or default this value.
- Run structured searches for:
  - string literals (`'Everywhere'`, `'Überall'`)
  - assignments (`const location = ...`, `selectedLocation = ...`)
  - URL param parsing (`searchParams.get('location')`, `params.location`)
- Confirm backward compatibility mapping at every entry point.
- Add at least one regression test covering the default (no-param) server path.
```

### R4 — TDD Compliance: Clarify bugfix regression exception format

- **Source**: QA Round 1 gate + Implementation 017 TDD table used “⚠️ Post-fix (bugfix regression)”.
- **Current state**:
  - Implementer instructions mandate a TDD table and imply ✅ test-first for all new functions/classes.
  - QA instructions validate TDD table and require “Test Written First? must be ✅ Yes”.
  - Real bugfix work often cannot be strictly test-first without significant context; teams frequently add regression tests post-fix.
- **Proposed change**: Keep the strong gate, but explicitly allow a **bugfix regression** row type with strict evidence requirements.
- **Affected agents**: QA, Implementer
- **Risk**: MEDIUM (could weaken TDD discipline if abused). Mitigate with strict conditions.
- **Implementation template**:

```markdown
**Bugfix Regression Exception (ALLOWED only when applicable)**

If the change is a bugfix/refactor with no new API surface, the TDD table MAY use:
- `⚠️ Post-fix (bugfix regression)` in “Test Written First?”

But ONLY if all are true:
- The table includes a clear “Failure Reason” describing how/why the pre-fix code would fail.
- A regression test exists and protects the expected behavior.
- QA validates the test meaningfully exercises the bug (not a trivial assertion).

If these are missing, QA MUST fail the gate.
```

## Conflict Analysis

| Recommendation | Conflicting instruction | Nature of conflict | Impact if unchanged | Proposed resolution | Resolved? |
|---|---|---|---|---|---|
| R4 bugfix exception | QA TDD checklist says “Test Written First? must be ✅ Yes” (QA agent) | Direct contradiction with how bugfix regressions are handled | Repeated QA failures or inconsistent enforcement | Add explicit “bugfix regression exception” with strict rules | No |
| R1 smoke tests | DevOps Stage 2 “Verify success” is generic (DevOps agent) | Not contradictory; missing specificity | Health check passes but core flows broken | Add explicit smoke tests section | Yes (additive) |

## Logical Challenges

1. **Avoid weakening TDD**: Introducing a bugfix exception risks being used as a loophole.
   - **Solution**: Make exception conditional (“no new API surface”), require documented pre-fix failure mode + meaningful regression test.

2. **Keep QA/UAT scope bounded**: Adding SSR-default tests could balloon QA.
   - **Solution**: Trigger only when change touches URL params, sentinels, or server components reading `searchParams`.

## Risk Assessment

| Recommendation | Risk | Rationale | Mitigation |
|---|---|---|---|
| R1 Smoke tests | LOW | Adds minutes, reduces incident risk | Keep to 2–3 checks max |
| R2 SSR-default validation | LOW→MEDIUM | More manual steps | Make conditional + document URLs |
| R3 Sentinel checklist | LOW | Simple repeatable checklist | Trigger “when applicable” |
| R4 Bugfix TDD exception | MEDIUM | Potential discipline erosion | Strict constraints + QA scrutiny |

## Implementation Recommendations

### High-Impact, Low-Risk (implement first)

- R1 DevOps Stage 2 functional smoke tests
- R2 QA SSR-default-path validation (conditional)
- R3 Sentinel refactor checklist (conditional)

### Medium-Impact or Medium-Risk

- R4 Bugfix regression exception format for TDD compliance

## Suggested Agent Instruction Updates

**Files impacted (proposal only; DO NOT APPLY without approval):**
- [.github/agents/devops.agent.md](../../.github/agents/devops.agent.md)
- [.github/agents/qa.agent.md](../../.github/agents/qa.agent.md)
- [.github/agents/implementer.agent.md](../../.github/agents/implementer.agent.md)
- (Optional) [.github/agents/uat.agent.md](../../.github/agents/uat.agent.md)

**Approach options:**
- Option 1: Minimal patches to each agent file (preferred)
- Option 2: Add a shared “Sentinel Refactor Checklist” snippet and reference it from all agents (more consistency, slightly more work)

**Validation plan:**
- Next release: verify DevOps Stage 2 includes functional smoke tests
- Next sentinel refactor: verify QA requires SSR default-path scenario
- Next bugfix: verify TDD table exception is applied consistently and not abused

## User Decision Required

Choose one:

1. **Update now**: Approve implementing R1–R4 into agent instructions.
2. **Review first**: Approve only R1–R3 now; defer R4 (TDD exception) for later.
3. **Phase rollout**: Apply R1 now, observe 1–2 releases, then apply R2–R4.
4. **Defer**: Record lessons only; no instruction changes.

## Related Artifacts

- Retro 017: [agent-output/retrospectives/closed/017-i18n-header-and-hotfix-retrospective.md](../retrospectives/closed/017-i18n-header-and-hotfix-retrospective.md)
- v0.6.2 deployment: [agent-output/deployment/017-stage2-release-v0.6.2.md](../deployment/017-stage2-release-v0.6.2.md)
- v0.6.3 hotfix: [agent-output/deployment/hotfix-v0.6.3.md](../deployment/hotfix-v0.6.3.md)
