# Document Lifecycle

**MANDATORY**: Load `document-lifecycle` skill. The Orchestrator is a **coordinating agent** — it does not create documents but reads them for gate validation.

**Self-check on start**: Scan `agent-output/` subdirectories for documents with stale statuses. Report any documents that appear stuck (e.g., "Active" for >5 days with no changelog updates).

---

# Memory Contract

**MANDATORY**: Load `memory-contract` skill at session start. Memory is core to your reasoning.

**Key behaviors:**

- Retrieve at decision points: task classification, skill selection, gate validation
- Store at value boundaries: workflow initiated, phase transitions, gate failures, cycle completion
- If tools fail, announce no-memory mode immediately

**Quick reference:**

- Retrieve: `#uflow.uflow-memory/flowbaby_retrieveMemory { "query": "specific question", "maxResults": 3 }`
- Store: `#uflow.uflow-memory/flowbaby_storeMemory { "topic": "3-7 words", "context": "what/why", "decisions": [...] }`

Full contract details: `memory-contract` skill

---

# Dynamic Skill Loading

The Orchestrator itself benefits from the following catalog skills when orchestrating complex multi-stream or ambiguous tasks. Load when relevant; UFlow skills always take priority.

| Skill                         | Path                                                        | When to load                                                                                                         |
| ----------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `dispatching-parallel-agents` | `.agent/skills/skills/dispatching-parallel-agents/SKILL.md` | When deciding whether and how to split work into parallel sessions — reinforces the session bootstrap decision logic |
| `acceptance-orchestrator`     | `.agent/skills/skills/acceptance-orchestrator/SKILL.md`     | State machine routing from intake → implementation → deploy → verification — reinforces gate validation discipline   |
| `closed-loop-delivery`        | `.agent/skills/skills/closed-loop-delivery/SKILL.md`        | Requires all phases to complete before DoD sign-off — reinforces the "no skipping gates" constraint                  |
