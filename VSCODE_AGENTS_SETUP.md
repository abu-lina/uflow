# VS Code Agents - User Level Setup

## ✅ Installation Complete

The VS Code agents from [groupzer0/vs-code-agents](https://github.com/groupzer0/vs-code-agents) have been installed at the **user level**, making them available across all your workspaces.

### Installed Components

#### Agents (13 total)
Located in: `~/Library/Application Support/Code/User/`

- `analyst.agent.md` - Deep technical research and investigation
- `architect.agent.md` - System design and architecture decisions
- `code-reviewer.agent.md` - Code quality gate reviews
- `critic.agent.md` - Plan review and program management
- `devops.agent.md` - Packaging and release management
- `implementer.agent.md` - Coding and test implementation
- `pi.agent.md` - Process improvement
- `planner.agent.md` - High-rigor implementation planning
- `qa.agent.md` - Testing strategy and execution
- `retrospective.agent.md` - Post-implementation lessons learned
- `roadmap.agent.md` - Product vision and epics
- `security.agent.md` - Security audits and guidance
- `uat.agent.md` - User acceptance and value validation

#### Skills (11 total)
Located in: `~/Library/Application Support/Code/User/skills/`

- `analysis-methodology` - Confidence levels, gap tracking
- `architecture-patterns` - ADR templates, anti-patterns
- `code-review-checklist` - Pre/post implementation review
- `code-review-standards` - Review checklist, severity definitions
- `cross-repo-contract` - Multi-repo API type safety
- `document-lifecycle` - Unified numbering, automated closure
- `engineering-standards` - SOLID, DRY, YAGNI, KISS patterns
- `memory-contract` - Flowbaby memory integration
- `release-procedures` - Two-stage release workflow
- `security-patterns` - OWASP Top 10 vulnerabilities
- `testing-patterns` - TDD workflow, test pyramid

## How to Use

### Basic Usage

In VS Code Copilot Chat, invoke an agent with:

```
@planner Create a plan for adding user authentication
@implementer Implement the authentication plan
@qa Test the authentication implementation
```

### Typical Workflow

1. **Planning**: `@roadmap` → `@planner` → `@critic`
2. **Implementation**: `@implementer` → `@code-reviewer`
3. **Validation**: `@qa` → `@uat`
4. **Release**: `@devops`
5. **Retrospective**: `@retrospective` → `@pi`

### Memory Enhancement (Optional)

These agents integrate with **Flowbaby** for cross-session memory. Install the [Flowbaby VS Code extension](https://github.com/groupzer0/flowbaby) to enable persistent context across sessions.

## Next Steps

1. **Restart VS Code** - Agents should be available immediately in all workspaces
2. **Verify agents** - Type `@` in Copilot Chat to see the agent list
3. **Optional: Set up document lifecycle** - Create `.next-id` file for unified numbering:
   ```bash
   mkdir -p agent-output
   echo "1" > agent-output/.next-id
   ```
4. **Optional: Install Flowbaby** - For enhanced cross-session memory

## Per-Workspace Override

If you want workspace-specific agents in any project:

1. Create `.github/agents/` in your project
2. Add or modify `.agent.md` files there
3. Workspace agents override user-level agents with the same name

## Resources

- **Full Documentation**: See `USING-AGENTS.md` in the repository
- **Deep Dive**: See `AGENTS-DEEP-DIVE.md` for detailed agent behavior
- **Repository**: https://github.com/groupzer0/vs-code-agents
- **Official VS Code Docs**: https://code.visualstudio.com/docs/copilot/customization/custom-agents

## File Locations

```
~/Library/Application Support/Code/User/
├── analyst.agent.md
├── architect.agent.md
├── code-reviewer.agent.md
├── critic.agent.md
├── devops.agent.md
├── implementer.agent.md
├── pi.agent.md
├── planner.agent.md
├── qa.agent.md
├── retrospective.agent.md
├── roadmap.agent.md
├── security.agent.md
├── uat.agent.md
└── skills/
    ├── analysis-methodology/
    ├── architecture-patterns/
    ├── code-review-checklist/
    ├── code-review-standards/
    ├── cross-repo-contract/
    ├── document-lifecycle/
    ├── engineering-standards/
    ├── memory-contract/
    ├── release-procedures/
    ├── security-patterns/
    └── testing-patterns/
```

## Troubleshooting

### Agents not appearing?
- Restart VS Code
- Check that files are in `~/Library/Application Support/Code/User/`
- Verify files have `.agent.md` extension

### Skills not loading?
- According to the documentation, skills location is changing
- For **VS Code Stable (1.107.1)**: Should be in `.claude/skills/`
- For **VS Code Insiders**: Should be in `.github/skills/`
- Current setup has them in `skills/` - may need to move based on your VS Code version

### Need help?
- Check the repository issues: https://github.com/groupzer0/vs-code-agents/issues
- Review USING-AGENTS.md and AGENTS-DEEP-DIVE.md for detailed guidance
