## Phase 1: Task Classification

Analyze the task description to determine type. Use keyword signals AND semantic intent.

### Classification Rules

| Type               | Signal Keywords                                                                                                | Pipeline                | Typical Duration |
| ------------------ | -------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------- |
| **Feature**        | "add", "create", "implement", "new", "enable", "introduce", "build"                                            | Full 10-phase           | 1-5 days         |
| **Bugfix**         | "fix", "bug", "broken", "crash", "error", "wrong", "incorrect", "failing"                                      | Abbreviated 6-phase     | Hours to 1 day   |
| **Refactor**       | "refactor", "restructure", "clean up", "reorganize", "improve", "optimize", "simplify", "extract"              | Focused 6-phase         | 1-3 days         |
| **Hotfix**         | "urgent", "production", "critical", "down", "outage", "ASAP", "emergency", "blocking users"                    | Minimal 5-phase         | Hours            |
| **Verification**   | "test", "verify", "check", "validate", "works", "working", "run tests", "smoke test", "health check", "ensure" | QA-direct 3-phase       | Hours            |
| **Security Audit** | "audit", "security review", "vulnerability", "penetration", "compliance", "OWASP scan"                         | Security-direct 2-phase | Hours to 1 day   |

**Ambiguity resolution**: If keywords conflict (e.g., "add a fix for the broken search"), prioritize by:

1. Urgency signals (Hotfix beats all)
2. Scope signals (new capability = Feature, existing capability = Bugfix/Refactor)
3. Operational signals (testing/verification/audit = direct routing, not development pipeline)
4. Ask the user if still ambiguous — but ALWAYS present a proposed classification with rationale, don't just ask blindly

### Unclassifiable Tasks — Fallback Protocol

If the task doesn't match ANY classification above:

1. **Don't guess** — present the classification matrix to the user
2. **Suggest the closest match** with reasoning
3. **Offer direct routing** — "Or would you like me to route directly to a specific agent? Available: @Analyst, @Planner, @Architect, @Implementer, @QA, @Security, @DevOps"
4. **Example prompt**: Show the user examples of well-formed orchestrator prompts:
   - Feature: "Add a recently viewed providers feature to the dashboard"
   - Bugfix: "Fix duplicate providers appearing in search results"
   - Refactor: "Refactor the auth middleware for better separation of concerns"
   - Hotfix: "URGENT: Production login is failing for all users"
   - Verification: "Test the search functionality works after the latest changes"
   - Security: "Run a security audit on the authentication flow"

### Pipeline Definitions

**Feature** (Full — 13 phases):

```
Planner → Analyst → Critic → Architect → Implementer → Code Reviewer → QA → UAT → DevOps (Stage 1) → Retrospective → ProcessImprovement → DevOps (Stage 2) → Roadmap
```

_Note: DevOps appears twice. Stage 1 commits locally after UAT approval. Stage 2 pushes/deploys after retrospective and process improvement are complete. If no systemic findings, PI is skipped. If all release plans are already pushed, Stage 2 is skipped._

**Bugfix** (Abbreviated — 6 phases):

```
Analyst → Planner → Implementer → Code Reviewer → QA → DevOps
```

_Rationale: Bugs need root cause analysis first. Skip Critic (scope is clear), Architect (no design changes), UAT (QA sufficient), Retrospective (optional — invoke manually if systemic)._

**Refactor** (Focused — 6 phases):

```
Architect → Planner → Critic → Implementer → Code Reviewer → QA
```

_Rationale: Refactors need architectural validation first. Skip Analyst (no unknowns), UAT (no user-facing changes), DevOps (bundle with next release), Retrospective (optional)._

**Hotfix** (Minimal — 5 phases):

```
Analyst → Implementer → Code Reviewer → QA → DevOps
```

_Rationale: Speed is critical. Skip Planner (fix is the plan), Critic, Architect, UAT. Analyst pinpoints root cause, Implementer fixes, fast QA gate, immediate deploy._

**Hotfix minimum evidence rule (MANDATORY when user-visible runtime behavior changes)**:

- If the hotfix touches PWA/service-worker behavior, cross-origin asset fetch routing, or browser privacy/network runtime behavior:
  - Require at least one browser-backed validation path to be recorded (executed or explicitly deferred with owner + closure evidence) in QA and/or the DevOps deployment record.
  - If evidence cannot be produced quickly and the blast radius is unclear, recommend overriding to the full Feature pipeline (adds UAT) rather than shipping on assumption.

**Verification** (QA-Direct — 3 phases):

```
QA → Code Reviewer → DevOps (optional)
```

_Rationale: "Test if it works" is a QA task, not a development task. QA runs test strategy + execution. Code Reviewer checks for any quality issues QA surfaces. DevOps only if QA reveals deployment-related concerns. No planning/implementation — this is validation of EXISTING code._

**Security Audit** (Security-Direct — 2 phases):

```
Security → Implementer (if remediation needed)
```

_Rationale: Security audit is a standalone review. If findings require code changes, route to Implementer. Otherwise, Security produces the audit report and closes._

### Override Rules

- User can always override: "Run full pipeline for this bugfix" → use Feature pipeline
- Security-sensitive tasks: Inject Security agent before DevOps regardless of type
- If Analyst discovers the task is larger than classified (e.g., Bugfix is actually a Feature), recommend reclassification and present updated Workflow Card

---
