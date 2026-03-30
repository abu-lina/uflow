# Workflow Card Template

**Purpose**: Standard format for displaying workflow state at phase transitions. Used by the Orchestrator agent and available for any agent that wants to show pipeline status.

## Format

```
╔══════════════════════════════════════════════════════════════╗
║  WORKFLOW CARD — Task #{document_id}                        ║
╠══════════════════════════════════════════════════════════════╣
║  Task: {task description}                                   ║
║  Type: {Feature|Bugfix|Refactor|Hotfix}                     ║
║  Pipeline: {Full|Abbreviated|Focused|Minimal} ({N} phases)  ║
║  Iteration: {N}                                             ║
╠══════════════════════════════════════════════════════════════╣
║  PIPELINE STATUS                                            ║
║  {icon} Phase {N}: {agent name} — {status text}             ║
║  ...                                                        ║
╠══════════════════════════════════════════════════════════════╣
║  CURRENT PHASE: {phase title}                               ║
║  Agent: @{agent_name}                                       ║
║  Next: @{next_agent} (gate: {gate condition})               ║
╠══════════════════════════════════════════════════════════════╣
║  SKILLS FOR CURRENT PHASE                                   ║
║  UFlow:   {skill1}, {skill2}, ...                           ║
║  Native:  {agent-embedded skills already wired}             ║
║  Catalog: {general-skill1} (score: N), ...                  ║
╠══════════════════════════════════════════════════════════════╣
║  ACCEPTANCE CRITERIA (populated after Planner phase)        ║
║  - {observable outcome 1}                                   ║
║  - {observable outcome 2}                                   ║
║  OUT OF SCOPE: {what agents must NOT touch — 1-2 items}     ║
╠══════════════════════════════════════════════════════════════╣
║  INSTRUCTIONS FOR @{agent}                                  ║
║  Load skill '{name}' from '{path}' — {reason}               ║
║  ...                                                        ║
║  Gate for next phase: {what must be true to advance}        ║
╚══════════════════════════════════════════════════════════════╝
```

## Status Icons

| Icon | Meaning                                    |
| ---- | ------------------------------------------ |
| ✅   | Phase completed successfully               |
| 🔵   | Currently in progress                      |
| ○    | Not yet started                            |
| ❌   | Failed / blocked (needs re-routing)        |
| ⏭   | Skipped (not applicable for this pipeline) |
| 🔄   | Re-doing (gate failed, routed back)        |

## Rules

1. **Always show at phase transitions**: Display updated card when recommending a handoff
2. **Show gate result**: When validating a gate, show PASS ✅ or FAIL ❌ with reason
3. **Track iterations**: If a phase is repeated (e.g., QA fails → Implementer → QA again), increment iteration counter
4. **Escalation**: After 3 iterations on the same gate failure, add "⚠️ ESCALATION: {gate} has failed {N} times" and recommend user intervention
5. **Security override**: If security-sensitive, show "🔒 Security audit injected before DevOps" in pipeline status

## Example — Feature, Phase 3 In Progress

```
╔══════════════════════════════════════════════════════════════╗
║  WORKFLOW CARD — Task #002                                  ║
╠══════════════════════════════════════════════════════════════╣
║  Task: Add provider search with location-based filtering    ║
║  Type: Feature                                              ║
║  Pipeline: Full (10 phases)                                 ║
║  Iteration: 1                                               ║
╠══════════════════════════════════════════════════════════════╣
║  PIPELINE STATUS                                            ║
║  ✅ Phase 1: Planner — Plan created (002-provider-search)   ║
║  ✅ Phase 2: Analyst — No unknowns identified (skipped)     ║
║  🔵 Phase 3: Critic — Reviewing plan                        ║
║  ○  Phase 4: Architect                                      ║
║  ○  Phase 5: Implementer                                    ║
║  ○  Phase 6: Code Reviewer                                  ║
║  ○  Phase 7: QA                                             ║
║  ○  Phase 8: UAT                                            ║
║  ○  Phase 9: DevOps                                         ║
║  ○  Phase 10: Retrospective                                 ║
╠══════════════════════════════════════════════════════════════╣
║  CURRENT PHASE: Review the plan                             ║
║  Agent: @Critic                                             ║
║  Next: @Architect (gate: no blocking arch concerns)         ║
╠══════════════════════════════════════════════════════════════╣
║  SKILLS FOR CURRENT PHASE                                   ║
║  UFlow:   code-review-checklist, engineering-standards       ║
║  Native:  cross-repo-contract (conditional)                 ║
║  Catalog: (none needed)                                     ║
╠══════════════════════════════════════════════════════════════╣
║  ACCEPTANCE CRITERIA                                        ║
║  - Search returns providers within specified radius          ║
║  - Results are ranked by proximity                           ║
║  - Empty state shown when no providers in range              ║
║  OUT OF SCOPE: Do not modify existing provider card layout   ║
╠══════════════════════════════════════════════════════════════╣
║  INSTRUCTIONS FOR @Critic                                   ║
║  Load 'code-review-checklist' — plan quality assessment     ║
║  Load 'engineering-standards' — SOLID/DRY/YAGNI/KISS check  ║
║  Continue work chain #002                                   ║
║  Gate for next: Critique verdict APPROVED, no open questions║
╚══════════════════════════════════════════════════════════════╝
```

## Example — Bugfix, Gate Failed

```
╔══════════════════════════════════════════════════════════════╗
║  WORKFLOW CARD — Task #005                                  ║
╠══════════════════════════════════════════════════════════════╣
║  Task: Fix broken search pagination                         ║
║  Type: Bugfix                                               ║
║  Pipeline: Abbreviated (6 phases)                           ║
║  Iteration: 2                                               ║
╠══════════════════════════════════════════════════════════════╣
║  PIPELINE STATUS                                            ║
║  ✅ Phase 1: Analyst — Root cause: off-by-one in offset     ║
║  ✅ Phase 2: Planner — Fix plan created                     ║
║  🔄 Phase 3: Implementer — Re-doing (QA failed iteration 1)║
║  ❌ Phase 4: Code Reviewer — Blocked (awaiting impl fix)    ║
║  ❌ Phase 5: QA — FAILED: regression in page 2 results     ║
║  ○  Phase 6: DevOps                                         ║
╠══════════════════════════════════════════════════════════════╣
║  CURRENT PHASE: Implement the fix (retry)                   ║
║  Agent: @Implementer                                        ║
║  Next: @Code Reviewer (gate: fix applied, tests green)      ║
╠══════════════════════════════════════════════════════════════╣
║  ACCEPTANCE CRITERIA                                        ║
║  - Page 2 results no longer duplicate page 1                ║
║  - Offset calculation uses 0-based index                    ║
║  OUT OF SCOPE: Do not refactor search query builder         ║
╚══════════════════════════════════════════════════════════════╝
```
