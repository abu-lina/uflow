---
ID: 180
Origin: 180
UUID: f6a2d8e4
Status: Active
---

# QA Report: Fix /api/chat 503 — Add MISTRAL_API_KEY to deployments

## Changelog
| Date | Agent | Change |
|------|-------|--------|
| 2026-06-17 | QA | Initial validation — QA COMPLETE |

## Scope

Deployment configuration fix — no code changes. Validating that `MISTRAL_API_KEY` env var is correctly configured in both deployment workflows.

## Validation Results

### 1. YAML/Workflow Syntax

| File | Status |
|------|--------|
| `.github/workflows/deploy-uat.yml` | ✅ Valid — no syntax errors |
| `.github/workflows/deploy-hetzner.yml` | ✅ Valid — no syntax errors |

### 2. UAT Workflow — Resolve Step

| Check | Status | Detail |
|-------|--------|--------|
| Variable resolution with fallback | ✅ | `UAT_MISTRAL_API_KEY="${{ secrets.UAT_MISTRAL_API_KEY || secrets.MISTRAL_API_KEY }}"` (line 72) |
| GITHUB_OUTPUT entry | ✅ | `echo "mistral_api_key=$UAT_MISTRAL_API_KEY"` (line 89) |

### 3. UAT Workflow — Docker Runs

| Run | Line | Status |
|-----|------|--------|
| Blue-green (port 3003) | 204 | ✅ `-e MISTRAL_API_KEY="${{ steps.resolve-uat-env.outputs.mistral_api_key }}"` |
| Final (port 3001) | 259 | ✅ Same as above |

### 4. Production Workflow — Docker Runs

| Run | Line | Status |
|-----|------|--------|
| Blue-green (port 3002) | 151 | ✅ `-e MISTRAL_API_KEY="${{ secrets.MISTRAL_API_KEY }}"` |
| Final (port 3000) | 205 | ✅ Same as above |

### 5. Variable Name Consistency

| Check | Status | Detail |
|-------|--------|--------|
| Env var matches openrouter.ts | ✅ | `MISTRAL_API_KEY` matches `process.env.MISTRAL_API_KEY` in `src/lib/openrouter.ts:36` |
| UAT follows fallback pattern | ✅ | Same `UAT_` prefix convention as other vars |

### 6. Deployment Logic Integrity

| Check | Status | Detail |
|-------|--------|--------|
| Both blue-green phases get the env var | ✅ | Present in temp port AND final port runs |
| No hardcoded secrets | ✅ | Only references GitHub Actions secrets |
| Continuation characters correct | ✅ | All lines end with `\` (no trailing space) |

## QA Verdict

**QA COMPLETE** ✅ — All checks pass.

- 2 workflow files modified
- 6 total insertions (4 UAT + 2 production)
- Consistent with existing patterns
- Ready for UAT deployment
