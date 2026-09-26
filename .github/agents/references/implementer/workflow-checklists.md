## Workflow

### Memory Checkpoints (MANDATORY)

Store memory at these moments (value boundaries):

- After completing each plan milestone
- After discovering a new constraint/gotcha (e.g., schema drift)
- Before handing off to Code Review

Each memory entry must include: plan ID, files touched, decisions made, and next step.

### Memory Retrieval Validation (MANDATORY)

Immediately after storing a memory checkpoint, run a retrieval query that should match it.

- Required: the retrieval returns ≥ 1 result.
- If retrieval returns 0 results:
  - Store a second memory entry with a clearer topic that includes: `Plan <ID>`, phase name, and 2–3 stable keywords (e.g., `migration`, `EXPLAIN`, `fallback`, `release`).
  - Then re-run retrieval to confirm discoverability.

1. Read complete plan from `agent-output/planning/` + analysis (if exists) in full. These—not chat—are authoritative.
2. Read evaluation criteria: `~/.config/Code/User/prompts/qa.agent.md` + `~/.config/Code/User/prompts/uat.agent.md` to understand evaluation.
3. When addressing QA findings: Read complete QA report from `agent-output/qa/` + `~/.config/Code/User/prompts/qa.agent.md`. QA report—not chat—is authoritative.
4. Confirm Value Statement understanding. State how implementation delivers value.
5. **Check for unresolved open questions** (see Core Responsibility #4). If found, halt and recommend resolution before proceeding.
6. Confirm plan name, summarize change before coding.
7. Enumerate clarifications. Send to planning if unresolved.

**>>> TDD GATE (BLOCKING — DO NOT SKIP) <<<**

8. **Identify all new functions/classes** you will create for this plan. List them explicitly.
9. **For EACH new function/class, execute the TDD Gate Procedure:**
   a. Write the test FIRST — create test file, import the non-existent module/function
   b. Run test — verify failure with correct reason (ModuleNotFoundError, undefined, or AssertionError)
   c. Copy/paste or screenshot the test failure output
   d. Report: "TDD Gate: Test `test_X` fails as expected: [error]. Proceeding."
   e. **⛔ DO NOT proceed to implementation until you have failure evidence**
10. Implement minimal code to make test pass. Run test again to confirm green.
11. Refactor if needed while keeping tests green.
12. **Repeat steps 9-11 for each function/class** before moving to next.

**>>> END TDD GATE <<<**

13. When VS Code subagents are available, you may invoke Analyst and QA as subagents for focused tasks (e.g., clarifying requirements, exploring test implications) while maintaining responsibility for end-to-end implementation.
14. Continuously verify value statement alignment. Pause if diverging.
15. Validate using plan's verification. Capture outputs.
16. Ensure test coverage requirements met (validated by QA).
17. Create implementation doc in `agent-output/implementation/` matching plan name. **NEVER modify `agent-output/qa/`**.
18. Document findings/results/issues in implementation doc, not QA reports.
19. Prepare summary confirming value delivery, including outstanding/blockers.

### Cross-Layer Integration Self-Check (MANDATORY)

When you add or modify ANY of the following:

- a new API route (`src/app/api/**/route.ts`)
- a new RPC/service function intended to be called by UI
- a redirect/link that includes query params (e.g., `?token=...`, `?claim=...`, `?returnUrl=...`)

You MUST verify **“caller exists”** and **“parameter is consumed”** before handing off:

- For each new API route: identify at least one production call site (UI, server action, cron, or another route) and trace the path end-to-end.
- For each emitted query param: open the receiving page/component and confirm it reads AND acts on the param.

If the caller is intentionally deferred (rare):

- Document the deferral explicitly in the Implementation doc (owner + trigger + evidence to close).
- Do NOT claim the milestone is complete unless the plan explicitly allows deferral.

### Search/Filter Client-Interaction Trace (MANDATORY when applicable)

**Trigger**: When you add or modify a form submit handler, URL parameter builder, or inline action in a component that renders a result list that could contain mixed entity types (e.g., `provider` + `community_service` rows — identifiable by sections like UMMAH that route to a different table, or by `section !== 'ummah'`-style guards elsewhere in the file).

Before handing off to Code Reviewer, verify and document:

**URL Lifecycle Trace** (for every modified or new submit handler):

1. Trace what query params are constructed in the submit handler.
2. Explicitly verify: which params are **preserved** from the current URL, and which are **dropped**.
3. Confirm that persistent navigation state (e.g., `section`, `status`, `location`) is NOT accidentally dropped by building from an empty `new URLSearchParams()` rather than `new URLSearchParams(window.location.search)`.
4. Write a unit or regression test that validates persistent params survive a submit-and-navigate cycle.

**Inline Action Entity-Type Guard** (for every inline action rendered in a result list):

1. For every action button in a result list (e.g., Approve, Reject, Bookmark): identify which entity types can appear in that list.
2. Confirm the action is statically or dynamically restricted to the correct entity type.
3. If the list can contain mixed entity types, confirm the action is guarded (e.g., `section !== 'ummah' && ...` or `entityType === 'provider' && ...`).
4. Write a test asserting the action does NOT render for the wrong entity type.

**Evidence**: Record in the implementation doc (one-liner per item):

- `URL lifecycle: section preserved via window.location.search reuse — ✅`
- `Inline action guard: section !== 'ummah' confirmed — ✅`

If the trigger does not apply, write: `Search/Filter Client-Interaction Trace: N/A — [reason]`.

### Multi-Plan State Extension Audit (MANDATORY when applicable)

**Trigger**: When the current plan extends, depends on, or builds on top of state introduced or modified by a **prior plan** — including state set in `useEffect` hooks, `useState` initializers, localStorage hydration effects, or derived/computed state expressions.

Before starting implementation, read all `useEffect`, `useState`, and localStorage hydration code that was introduced or modified by prior plans in the same component or hook. For each state mutation from prior plans, explicitly verify:

1. **Semantic compatibility**: Does the current plan's new state semantics (e.g., new derived expressions, new idle/results/empty states) still work correctly when the prior plan's mutation runs? Example: if a prior plan sets `someQuery = city` during hydration and the current plan's idle state requires `someQuery = ''`, the mutation must be updated.

2. **Derived state review**: If the current plan introduces a new computed/derived expression (e.g., `displayQuery = selected ? '' : inputQuery`), verify every upstream mutation that affects the inputs to that expression.

3. **Idle-state compatibility**: If the current plan adds an idle state (i.e., a value is selected but no user input has occurred), verify that prior plan initialization does not bypass the idle state by setting both "selected" and "input" state simultaneously.

**Evidence**: Record in the implementation doc:

```
Multi-Plan State Audit: Plan [prior IDs] mutations reviewed.
- [mutation line/file]: compatible ✅ / updated [description] ✅ / incompatible ⚠️ [description]
```

If the trigger does not apply, write: `Multi-Plan State Audit: N/A — no prior-plan state mutations in scope`.

### API Route Coverage Gate (MANDATORY when applicable)

If the plan adds or modifies a Next.js route handler (`src/app/api/**/route.ts`), the TDD Compliance table or verification section MUST include at least one route-level test row covering the route contract (status, body shape, timeout/error contract, or equivalent).

If route-level automated coverage is not practical, document the exception explicitly with rationale, owner, and follow-up gate.

### Local Verification Gate (MANDATORY when applicable)

If the change is user-visible and primarily affects UI, CSS, layout, interaction, hit-testing, scroll behavior, or responsive/mobile behavior, you MUST record local verification evidence before handoff.

- Start the relevant dev environment (`npm run dev`, `npm run dev:uat`, or the plan-specified equivalent).
- Verify the changed flow in a browser.
- Record one of the following in the Implementation doc:
  - `Local verification: ✅ Executed` — include route/flow checked and outcome
  - `Local verification: ⚠️ Blocked` — include exact blocker (for example: missing `.env.local`, missing credentials, unreproducible environment)

If blocked, do NOT present the implementation as fully verified. Surface the blocker clearly for QA/UAT.

### Interaction-Layer Audit Checklist (MANDATORY when applicable)

Trigger when fixing bugs involving:

- `pointer-events`
- `visibility` / `display`
- absolute/fixed/sticky positioned wrappers
- overlays, shells, or hit-testing/interception issues

Before handoff, verify and document:

- the intended interactive element
- every ancestor container up to the nearest layout boundary that could intercept events
- whether any fixed-position child requires explicit `pointer-events: auto`
- whether any parent container is reserving unnecessary document-flow height for fixed children

Do not stop at the first suspicious wrapper if a higher container can still intercept events.

### Post-UAT Delta Protocol (MANDATORY when applicable)

If you modify code after UAT approval and before DevOps handoff, record a `Post-UAT Delta Review` section in the Implementation doc.

You may use self-review only when ALL are true:

- change is <= 20 lines net
- no new files or dependencies
- no route-gating, auth, data, or API changes
- existing relevant tests were rerun and still pass
- local verification was rerun if the change is user-visible

Otherwise, return to Code Reviewer (and QA when applicable) before DevOps.

### Pre-Handoff QA Gate (MANDATORY)

Before handing off to **Code Reviewer** or **QA**, you MUST complete this checklist:

- [ ] `npm test` (or `npx vitest run`) exits `0`
- [ ] `npm run type-check` exits `0`
- [ ] `npm run build` exits `0`
- [ ] Implementation doc is updated: Files Modified/Created tables, Code Quality Validation, and **TDD Compliance** table is complete
- [ ] Implementation doc is committed before handoff: `git add agent-output/implementation/ && git commit -m "docs(<ID>): implementation doc"`
- [ ] `git status --short` shows **no unintended modifications** to implementation files — if any committed files appear as modified/deleted/missing, restore them before proceeding

If any item fails: STOP, fix, re-run. Do not hand off.

### Deployment Path Audit (MANDATORY when applicable)

If your change touches deployment surface area (examples: `Dockerfile`, `scripts/deploy-*`, `.github/workflows/deploy-*`, `deploy/nginx`, env vars, ports, volume mounts, image cache paths), you MUST perform and document a deployment path audit in your Implementation doc.

Minimum expectations:

- Run a repo search for deploy entrypoints:
  - `grep -R "docker run" .github/workflows scripts deploy -n`
  - `grep -R "--volume\|-v\|--mount" .github/workflows scripts deploy -n`
- Enumerate **every** deployment path you verified (GitHub Actions workflows + shell scripts + any other entrypoints you found)
- Confirm parity: each invocation reflects the intended change (e.g., volume mounts exist everywhere)

If you cannot verify a deployment path (missing access / unclear ownership), STOP and request clarification from Planner/DevOps rather than assuming.

### Local vs Background Mode

- For small, low-risk changes, run as a local chat session in the current workspace.
- For larger, multi-file, or long-running work, recommend running as a background agent in an isolated Git worktree and wait for explicit user confirmation via the UI.
- Never switch between local and background modes silently; the human user must always make the final mode choice.

## Response Style

- Direct, technical, task-oriented.
- Reference files: `src/module/file.py`.
- When blocked: `BLOCKED:` + questions
