---
ID: 101
Origin: 101
UUID: 3f8a2c7d
Status: Processed
---

# Retrospective 101+102: Wo Location Default + City Results Redesign

**Plan References**:
- `agent-output/planning/closed/101-search-location-default.md`
- `agent-output/planning/closed/102-wo-city-results-redesign.md`
**Date**: 2026-04-25T00:00Z
**Retrospective Facilitator**: retrospective

## Changelog

| Date (UTC) | Agent | Action | Summary |
|---|---|---|---|
| 2026-04-25T00:00Z | Retrospective | Created | Post-release retrospective for Plans 101+102 (v0.10.26) |
| 2026-04-25T05:35Z | ProcessImprovement | Processed | PI-1–PI-5 extracted; PI-1/PI-2/PI-3/PI-5 applied to agent files; PI-4 already codified |

---

## Summary

**Value Statement (Plan 101)**: As a user who has already selected my city during onboarding, I want the "Where" search field to be pre-filled with my city when I open the search page, and I want the Where and What fields to look and feel consistent, so that I can start searching immediately without re-entering my location every time.

**Value Statement (Plan 102)**: As a user searching for food services on `/search`, I want the "Where" (Wo) accordion to look and behave like the redesigned "What" (Was) section — showing the most popular cities by provider count when idle, displaying city results in rich card rows with a location icon and provider count, supporting controlled open/close behavior, closing after I tap a city, and showing my selection in the collapsed header — so that the search experience feels cohesive and the Wo section is as discoverable and frictionless as Was.

**Value Delivered**: YES — both value statements fully delivered with 0 CRITICAL/HIGH/MEDIUM defects.

**Implementation Duration**: ~24 hours end-to-end (Plan 101 created ~00:00Z; v0.10.26 released ~23:45Z on 2026-04-24)

**Overall Assessment**: A well-executed same-day dual-plan bundle. Plan 101 was a small but precise bugfix-style improvement; Plan 102 was a more substantial feature that followed an established pattern (Was section) to near-zero design risk. The pipeline ran efficiently — abbreviated flow was appropriate and no major blockers were encountered. One notable pattern emerged: post-UAT UX fixes required an additional QA/Code Review loop that increased total handoff count but was handled smoothly.

**Focus**: Repeatable process improvements over one-off technical details.

---

## Timeline Analysis

### Plan 101

| Phase | Estimated Duration | Actual | Variance | Notes |
|---|---|---|---|---|
| Planning | — | 00:00Z → 16:10Z (~16h) | — | Plan created and reviewed overnight; not a blocker |
| Critique | — | 16:10Z (0.5h) | — | Single-pass; 2 MEDIUM + 3 LOW; no blockers |
| Implementation | 2–4h | 16:20Z → 18:30Z (~2h) | On estimate | Critique findings addressed inline; clean first-pass |
| Code Review | — | 18:30Z → 16:40Z* | — | *Review was authored contemporaneously; <1h |
| QA | 1–2h | 20:00Z → 20:35Z (~35min) | Under estimate | Full automated suite executed; browser deferred |
| UAT | 0.5h | 20:35Z → 21:00Z (~25min) | On estimate | Value statement fully verified from artifacts |
| DevOps | 0.5h | 23:30Z → 23:45Z (~15min) | Under estimate | Bundled with Plan 102 |
| **Total** | **4–7h** | **~7h active** | On estimate | Overnight planning adds clock hours but not effort |

### Plan 102

| Phase | Estimated Duration | Actual | Variance | Notes |
|---|---|---|---|---|
| Planning | — | 21:30Z (created) | — | Created after Plan 101 UAT approved; fast |
| Critique | — | 19:52Z (pre-plan) | — | *Critique timestamps predate plan creation — timing anomaly from session ordering; all findings addressed before implementation |
| Implementation | 2–4h | 19:55Z → 22:10Z (~2h15min) | On estimate | All M1–M6 in one pass |
| Code Review (initial) | — | 22:10Z → 22:20Z (~10min) | Under estimate | Clean first-pass; 0 CRITICAL/HIGH/MEDIUM |
| QA (initial) | 1–2h | 22:30Z → 22:40Z (~10min) | Under estimate | All gates passed; 1078 tests green |
| UAT | 0.5h | 22:40Z → 22:55Z (~15min) | Under estimate | 6 scenarios validated; DF-1 deferred |
| UX fixes (post-UAT) | Unplanned | 22:55Z → 23:05Z (~10min) | +10min rework | 3 UX issues found; code fix + QA re-run + delta CR |
| DevOps | 0.5h | 23:30Z → 23:45Z (~15min) | Under estimate | Bundled with Plan 101 |
| **Total** | **4–7h** | **~4h active** | Under estimate | Post-UAT rework was minor; did not delay release |

---

## What Went Well (Process Focus)

### Workflow and Communication

- **Was section as a living pattern reference**: Both Plan 101 (state split) and Plan 102 (5-state component, controlled accordion, recent searches) explicitly cited the Was section code as the model. This eliminated design ambiguity and allowed the implementer to follow an established pattern without agent consultation. The pattern-documentation approach (Was vs Wo comparison table in Plan 102) is repeatable and high-value.

- **Bundled release recommended at plan time**: The Planner explicitly noted "release together with Plan 101" in Plan 102. This prevented two separate DevOps cycles for adjacent work in the same file and reduced overhead.

- **Post-UAT delta protocol worked correctly**: When UX issues were found after UAT, the team applied the post-UAT delta protocol (fresh Code Review delta doc for the specific change). The delta was narrow (88px → 72px height fix + translation cleanup), approved quickly, and did not block release. The protocol absorbs post-UAT corrections without requiring a full UAT re-run.

### Agent Collaboration Patterns

- **Critique-first on Plan 101 caught F-MED-1 early**: The Critic identified that Plan 101's M1 acceptance criteria used the old `woQuery` name while M3 introduced the new split model. Catching this before implementation prevented a two-pass refactor during coding. This is a direct example of Critic value in the abbreviated pipeline.

- **Implementer addressed critique findings inline before coding**: Rather than waiting for a plan amendment cycle, the Implementer updated F-MED-1 and F-MED-2 in the plan before starting implementation. The handoff was clean; no back-and-forth was needed.

- **QA focused on behavior paths, not just test counts**: The QA reports for both Plans 101 and 102 explicitly answered "does coverage match the plan's acceptance criteria?" rather than just reporting pass/fail. The coverage adequacy questions in Plan 102's QA report are a strong template for future iterations.

### Quality Gates

- **TDD compliance on Plan 102**: Service (`fetchPopularCities`) and component (`WoCityResults`) tests were written first. The page integration test was correctly classified as a post-fix regression (allowed and documented) rather than being falsely claimed as TDD. This transparency in the TDD table is the right standard.

- **No CRITICAL/HIGH/MEDIUM findings in either code review**: Both reviews passed with only INFO-level observations. The pattern-following approach (mirroring Was architecture) removed the primary risk surface — no novel architectural patterns were introduced.

- **All 1078 tests green with zero regressions**: The full suite health check across both plans confirms no cross-module regressions. This is particularly notable given that `page.tsx` was heavily modified in both plans.

---

## What Didn't Go Well (Process Focus)

### Workflow Bottlenecks

- **Post-UAT UX issues required unplanned rework cycle**: Three UX discrepancies were found after Plan 102 UAT: (1) hardcoded "In meiner Nähe" default label persisting even with a selected city; (2) selected city not visible in idle state without typing; (3) Wo ↔ Was parity gap. These were user-facing correctness issues that QA and UAT should have caught. The post-UAT discovery added a code fix + QA report + delta Code Review loop. While the protocol handled it gracefully, catching these earlier would have been better.

  **Root cause**: The QA and UAT agents relied heavily on automated test output rather than mentally simulating the actual idle state with a pre-selected city. The idle state (city selected but no query typed) was the specific scenario where the defect manifested — and it is hard to cover fully with component mocks that unconditionally render children.

- **Timestamp anomaly in Plan 102 critique**: The Plan 102 critique timestamps (19:52Z) predate the plan creation timestamp (21:30Z). This is a session-ordering artifact from the worktree — the critique was authored for a prior version of the plan and timestamps were not updated to match plan creation time. While it did not cause functional issues, it creates audit trail confusion. The deployment doc noted this and accepted it, but the upstream fix would be ensuring critique timestamps are updated when a plan's creation timestamp is revised.

- **QA test for idle state used unconditional mock**: The `ExpandSection` mock renders children unconditionally regardless of `isOpen`. This means accordion collapse behavior is not tested at all. The Code Reviewer flagged this as INFO, but it directly contributed to the post-UAT UX bugs being missed — the test passed even when the idle state was broken because the mock never hid content. This is a concrete test quality gap.

### Agent Collaboration Gaps

- **UAT did not simulate idle state with pre-selected city**: Both UAT agents (Plans 101 and 102) validated scenarios from artifacts (implementation evidence + QA reports) rather than reasoning through the user journey independently. The idle state scenario — page loads, city is pre-selected from onboarding, user opens Wo accordion without typing — was the exact failure mode. UAT should include an explicit "idle state with prior selection" scenario in its standard scenario checklist.

- **Plan 101 initial target version (v0.10.25) was incorrect**: Plan 101 originally targeted v0.10.25, but v0.10.25 was already tagged for Plans 098–100. The version was corrected to v0.10.26 during DevOps pre-flight. The Planner did not check existing tags before specifying the target version. This is a repeatable risk in a session where multiple plans are in flight.

### Misalignment Patterns

- **State coupling introduced during Plan 101 implementation caused Plan 102 post-UAT bug**: The specific root cause of the post-UAT fix was that during Plan 101 implementation, onboarding hydration set both `selectedWoCity = city` and `woInputQuery = city` simultaneously. This was correct for Plan 101's original display model but became incorrect when Plan 102 added the idle state (which shows popular cities when `woInputQuery` is empty and city is selected). The Plan 102 implementation did not revisit the Plan 101 hydration effect — it assumed the state model was correct. The coupling was only discovered after UAT when the idle state was visually tested.

  This is a systemic pattern: **when Plan B extends Plan A's state model, Plan B's implementer must explicitly review all Plan A state mutations and verify compatibility with Plan B's new state semantics**. This did not happen in the handoff.

---

## Agent Output Analysis

### Changelog Patterns

**Total Handoffs**: 12 across Plans 101+102

| From Agent | To Agent | Artifact | What Requested | Issues Identified |
|---|---|---|---|---|
| Planner | Critic | Plan 101 | Review plan | F-MED-1 (state naming), F-MED-2 (hydration clarity), F-LOW-1 (semver), F-LOW-2 (HOW territory), F-LOW-3 (cross-surface gap) |
| Critic | Implementer | Critique 101 | Implement Plan 101 | F-MED-1 and F-MED-2 addressed inline by Implementer |
| Implementer | Code Reviewer | Impl 101 | Review implementation | APPROVED; 1 INFO (manual browser deferred) |
| Code Reviewer | QA | CR 101 | Run QA gates | All automated gates passed; browser deferred to UAT |
| QA | UAT | QA 101 | Validate value delivery | APPROVED FOR RELEASE; DF-1 deferred |
| UAT | Planner | Plan 102 created | Plan Wo redesign | Clean plan creation; quick critique |
| Critic | Implementer | Critique 102 | Implement Plan 102 | F-MED-1 (aggregation path), F-LOW-1 (semver), F-LOW-2 (type simplicity) — all addressed |
| Implementer | Code Reviewer | Impl 102 | Review implementation | APPROVED_WITH_COMMENTS; 1 INFO (ExpandSection mock fidelity) |
| Code Reviewer | QA | CR 102 | Run QA gates | All gates passed; 1078 tests |
| QA | UAT | QA 102 | Validate value delivery | APPROVED; DF-1 deferred |
| UAT / User | QA | QA 102-ux-fixes | Fix 3 UX issues | 3 post-UAT issues found and fixed; re-QA passed |
| Code Reviewer | DevOps | CR height delta | Delta review for 72px fix | APPROVED; released |

**Handoff Quality Assessment**:
- Handoffs were generally complete and well-documented with clear verdict and next-step lines.
- The post-UAT UX fix handoff was user-initiated, not from a structured process gate — it relied on the user noticing the regression rather than a UAT checklist item catching it.
- Context was preserved across handoffs; all agents correctly referenced plan artifacts.
- One unnecessary complexity: two separate QA docs for Plan 102 (`102-wo-city-results-redesign-qa.md` and `102-wo-ux-fixes.md`). A single QA doc with a "re-test" section would be cleaner.

### Issues and Blockers Documented

| Issue | Artifact | Resolution | Escalated? | Time to Resolve |
|---|---|---|---|---|
| F-MED-1: State naming inconsistency in M1 AC | Critique 101 | Resolved inline before implementation | No | <1h |
| F-MED-2: Hydration ambiguity | Critique 101 | Resolved inline before implementation | No | <1h |
| F-LOW-1: Semver vague | Critique 101 | v0.10.25 added to plan | No | <30min |
| F-LOW-3: Cross-surface SearchBar gap | Critique 101 | open-actions.md entry added | No | Tracked |
| Plan 102 version target wrong | DevOps pre-flight | Corrected to v0.10.26 | No | <5min |
| Post-UAT: hardcoded "near me" label | QA 102-ux-fixes | Translation files updated | No | ~10min |
| Post-UAT: city not visible in idle | QA 102-ux-fixes | State decoupling patch applied | No | ~10min |
| Post-UAT: Wo↔Was parity | QA 102-ux-fixes | Combined fix with above | No | Combined |
| Timestamp anomaly in Plan 102 critique | Deployment doc | Accepted/documented | No | Low impact |
| DF-1: browser runtime validation | UAT 101+102 | Deferred post-release, 24h | No | Pending |

**Issue Pattern Analysis**:
- Most common type: **planning documentation gaps** (state naming, hydration clarity, semver) — all caught by Critique agent early.
- Second most common: **post-UAT UX correctness issues** — all rooted in idle-state simulation gaps in testing.
- No issues required escalation to Architect.
- No blockers caused phase delays. All issues resolved within the same session.

---

## Sections: Technical Patterns (Secondary)

### State Coupling Anti-Pattern — Plan A → Plan B Extension

When Plan 102 extended Plan 101's state model, the Plan 101 hydration effect (`setSelectedWoCity(city); setWoInputQuery(city)`) was preserved unchanged. But Plan 102 added the idle state which requires `woInputQuery = ''` when a city is selected. This semantic mismatch only manifested in the live idle state, not in component-level tests that mock state directly.

**Lesson**: When Plan B extends Plan A's state model, the implementer checklist should include: "Review all Plan A state mutations. Do they remain compatible with Plan B's derived state semantics?"

### Pattern-Based Implementation (Positive)

Both Plans 101 and 102 referenced the Was section as the design and code model. Plan 102's gap analysis table (Was current vs Wo current vs Target) is an excellent planning pattern for parity-based features. The table made the implementation scope unambiguous and prevented guessing about which behaviors to replicate.

### Client-Side Aggregation Justified at Current Scale

`fetchPopularCities` fetches all city rows and aggregates in JS rather than using a Postgres `GROUP BY`. At current DAU/city count (<50 cities), this is the correct tradeoff: no migration, no RPC, easier testing. The plan documented the scale threshold (DAU > 5,000) at which to revisit. This is the Postgres-first principle applied correctly.

---

## Recommendations for Future Iterations

### Process Improvements

**PI-1: Idle-state scenario is mandatory in UAT checklist for search/filter components**

The post-UAT UX bugs were all idle-state failures (page load with pre-selected value, no user input). This scenario is the most common "overlooked" state in form components — it requires neither data loading nor user interaction, making it invisible to standard "happy path" and "error path" tests.

**Recommendation**: Add to UAT standard scenario checklist:
> "Scenario: Page loads with a pre-selected/pre-filled value. Open the relevant accordion or control WITHOUT typing. Verify: (a) selection is visually displayed, (b) idle content (popular/recent) renders correctly, (c) header label is dynamic, not hardcoded."

This applies to Was, Wo, Wer, Filter, and any future accordion or typeahead component.

**PI-2: Enforce ExpandSection mock fidelity for accordion open/close tests**

The `ExpandSection` mock renders children unconditionally. This means accordion collapse tests pass vacuously — they never verify that content is hidden when `isOpen=false`. This masks real bugs (the post-UAT idle state issue was in part invisible to tests because of this).

**Recommendation**: Replace the unconditional `ExpandSection` mock with a controlled mock:
```tsx
vi.mock('@/components/ui/ExpandSection', () => ({
  ExpandSection: ({ title, isOpen, children }) => (
    <section>
      <h3>{title}</h3>
      {isOpen !== false && <div>{children}</div>}
    </section>
  ),
}));
```
Or add at least one test per accordion-based component that verifies hidden content when `isOpen=false`.

**PI-3: Plan B must explicitly audit Plan A state mutations for semantic compatibility**

When a plan extends an existing state model from a prior plan, the Implementer should add to their implementation checklist:
> "Reviewed Plan A state mutations. Confirmed each mutation remains compatible with Plan B's derived state semantics."

This prevents the state-coupling bug pattern where a new idle-state rendering mode conflicts with how the prior plan initialized state.

**PI-4: Version target verification by Planner before plan finalization**

Plan 101 originally targeted v0.10.25, which was already taken. The Planner should check `git tag --list "v*" | sort -V | tail -5` before specifying a semver target. This is a 30-second check that prevents downstream confusion at DevOps Stage 1.

**Recommended addition to Planner instructions**:
> "Before specifying Target Release, run `git tag --list 'v*' | sort -V | tail -5` to confirm the target version does not already exist."

**PI-5: Consolidate post-UAT QA into the existing QA doc (re-test section) rather than creating a new doc**

Plan 102 ended up with two QA docs: the initial QA doc and the UX-fixes QA doc. Both track the same plan, but the split creates fragmented audit trail. A cleaner approach is a "Re-test" section at the bottom of the original QA doc:

```markdown
## Re-test: [Description of post-UAT fix]
**Date**: YYYY-MM-DDTHH:MMZ
**Trigger**: Post-UAT UX issues [list]
**Changes**: [files + description]
**Re-test Result**: [pass/fail + evidence]
```

This maintains a single source of truth per plan without spawning new documents for minor post-UAT corrections.

---

## Open Actions

| ID | Action | Owner | Priority | Notes |
|---|---|---|---|---|
| DF-1 | Manual browser validation: Wo idle state on mobile + desktop | QA / DevOps | HIGH (24h post-release) | Validate popular cities render, city tap closes accordion, clear reset works on iOS/Android and desktop |
| PI-1 | Add idle-state scenario to UAT checklist for accordion/typeahead components | Planner / Process | MEDIUM | Apply to Was, Wo, Wer, Filter |
| PI-2 | Update `ExpandSection` mock in page.test.tsx to respect `isOpen` prop | QA / Implementer | MEDIUM | Prevents vacuous accordion tests |
| PI-3 | Add Plan A → Plan B state compatibility audit to Implementer checklist | Process | MEDIUM | See recommendation above |
| PI-4 | Add version pre-check to Planner instructions | Process | LOW | `git tag --list 'v*'` before specifying target release |
| PI-5 | Consolidate post-UAT QA into re-test section of existing doc | Process | LOW | Reduce doc proliferation for minor post-UAT corrections |
| F-LOW-3 | Cross-surface location default for SearchBar.tsx on /providers and /saved | Implementer (future plan) | LOW | Tracked in agent-output/planning/open-actions.md |

---

## Positive Patterns Worth Repeating

1. **Was-section gap analysis table** — The "Current vs Target" table in Plan 102 is a high-signal planning pattern for parity features. Adopt for any feature that mirrors an existing UX component.

2. **Bundled release at plan-time** — Recommending `bundle with Plan 101` in the Plan 102 release strategy header prevents two DevOps cycles for adjacent work. Any plan that touches the same file as a contemporaneous plan should make this recommendation.

3. **Critique findings resolved inline by Implementer** — Rather than routing back to Planner to amend the plan, the Implementer updated F-MED-1/F-MED-2 directly before starting implementation. This is the right approach for non-architectural findings in an abbreviated pipeline. Codify: "Implementer may amend plan document for Critique findings that are documentation-only with no architectural impact."

4. **Post-UAT delta protocol** — Narrow post-UAT code changes handled via a scoped Code Review delta doc without requiring a full QA/UAT re-run was appropriate and efficient. The protocol is working well. The only improvement (PI-5) is consolidating the QA evidence.

5. **TDD transparency** — Marking page integration tests as "post-fix regression (allowed)" rather than claiming strict TDD is the honest and correct practice. The distinction keeps the TDD table meaningful.

---

## Deployment History

| Version | Plans | Issues Closed | Date | Duration |
|---|---|---|---|---|
| v0.10.26 | 101 + 102 | #159, #162 | 2026-04-24 | ~24h total clock; ~4–7h active |

---

## Next Steps

1. **DF-1**: Execute browser runtime validation within 24h (Wo idle state, mobile + desktop)
2. **PI agent**: Review PI-1 through PI-5 for codification into agent instructions
3. **Roadmap**: Plans 101+102 Released — no follow-up planning required beyond DF-1
