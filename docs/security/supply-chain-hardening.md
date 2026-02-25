# Supply Chain Hardening

This document describes UFlow's supply chain security controls implemented to protect against NPM package typosquatting, malicious GitHub Actions, and AI toolchain poisoning attacks.

## Overview

Modern supply chain attacks target multiple vectors:

1. **NPM Package Typosquatting** — Malicious packages with names similar to popular packages
2. **GitHub Actions Injection** — Compromised or malicious third-party actions
3. **AI Toolchain Poisoning** — Rogue MCP servers injected into coding assistants (Claude, Cursor, Continue, etc.)
4. **Dependency Vulnerabilities** — Known CVEs in direct/transitive dependencies

UFlow implements defense-in-depth controls for each vector.

## CI/CD Controls

### 1. Supply Chain IOC Scanner

**Location**: [scripts/security/ioc-scan.sh](../../scripts/security/ioc-scan.sh)

A pre-install gate that scans `package.json`, `package-lock.json`, and GitHub workflows for known malicious packages and actions.

**What it detects**:
- Typosquatted NPM packages (e.g., `rimarf` instead of `rimraf`)
- Known malicious GitHub Actions and threat actor identifiers
- C2 domains and exfiltration endpoints

**When it runs**:
- First job in CI pipeline (all other jobs depend on it passing)
- Runs on every PR and push to protected branches

**Updating the IOC list**:

The IOC list is defined in the script itself. Update it when:
- New supply chain advisories are published
- Security team identifies new threats
- At minimum, review quarterly

```bash
# Test locally
./scripts/security/ioc-scan.sh
```

### 2. Dependency Review

**Location**: [.github/workflows/dependency-review.yml](../../.github/workflows/dependency-review.yml)

Automatically reviews dependency changes in PRs using GitHub's `dependency-review-action`.

**What it detects**:
- Known vulnerabilities (CVEs) in new or updated dependencies
- License compliance issues

**Configuration**:
- Fails on: `high` and `critical` severity vulnerabilities
- Allowed licenses: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, CC0-1.0, Unlicense

**When it runs**:
- On PRs that modify `package.json`, `package-lock.json`, or `npm-shrinkwrap.json`

## Local Developer Tools

### MCP Configuration Auditor

**Location**: [scripts/security/audit-mcp-configs.sh](../../scripts/security/audit-mcp-configs.sh)

A local script that scans AI assistant config files for unauthorized MCP server additions.

**What it checks**:
- `~/.cursor/mcp.json` (Cursor)
- `~/.claude/settings.json` (Claude Desktop/CLI)
- `~/.continue/config.json` (Continue)
- `~/.windsurf/mcp.json` (Windsurf/Codeium)

**How to use**:

```bash
# Run the audit
./scripts/security/audit-mcp-configs.sh

# JSON output (for scripting)
./scripts/security/audit-mcp-configs.sh --json
```

**Allowlist**:

The allowlist is stored in [scripts/security/mcp-allowlist.json](../../scripts/security/mcp-allowlist.json).

To add a legitimate MCP server:

1. Edit `mcp-allowlist.json`
2. Add the server URL (with prefix matching) or npx package name
3. Re-run the audit to confirm

**Example allowlist entry**:

```json
{
  "pattern": "https://mcp.example.com/",
  "description": "Example MCP server",
  "matchType": "prefix"
}
```

## Credential Rotation Checklist

If you suspect credential exposure or as a precautionary measure:

### NPM Tokens
- [ ] Revoke existing tokens at https://www.npmjs.com/settings/tokens
- [ ] Generate new tokens with minimal scope
- [ ] Update GitHub Actions secrets if used for publishing

### GitHub Tokens
- [ ] Audit Personal Access Tokens (PATs) at https://github.com/settings/tokens
- [ ] Revoke and regenerate any tokens used in CI/CD
- [ ] Review repository `GITHUB_TOKEN` permissions (Settings → Actions → General)

### Deploy Keys & SSH Keys
- [ ] Rotate SSH keys used for Hetzner deployment
- [ ] Update `HETZNER_SSH_KEY` secret in GitHub Actions
- [ ] Audit and rotate any other deploy keys

### Supabase Keys
- [ ] Anon keys are public by design — no rotation needed
- [ ] Service role keys: regenerate if potentially exposed
- [ ] Update CI secrets if service keys were rotated

### Post-Rotation
- [ ] Document what was rotated and when
- [ ] Test CI/CD pipeline to ensure new credentials work
- [ ] Monitor for failed authentication attempts

## References

- [Socket: Shai-Hulud NPM Worm Advisory](https://socket.dev/blog/sandworm-mode-npm-worm-ai-toolchain-poisoning)
- [GitHub Dependency Review Action](https://github.com/actions/dependency-review-action)
- [npm audit documentation](https://docs.npmjs.com/cli/v10/commands/npm-audit)
- [OWASP A06: Vulnerable and Outdated Components](https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/)

## Maintenance

| Control | Review Cadence | Owner |
|---------|----------------|-------|
| IOC Scanner list | On advisory / quarterly | Security |
| MCP Allowlist | On team change / quarterly | Security |
| Dependency Review config | Annually | Security |
| Credential rotation | On incident / annually | DevOps |
