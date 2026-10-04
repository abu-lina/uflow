---
ID: 180
Origin: 180
UUID: b3f8c1a4
Status: Active
---

# Implementation Plan: Fix /api/chat 503 on UAT

## Changelog
| Date | Agent | Change |
|------|-------|--------|
| 2026-06-17 | Planner | Initial plan | ID 180 |

## Problem

UAT Docker container is deployed without `MISTRAL_API_KEY` env var, causing `getLLMConfig()` to throw 'No AI provider configured', which returns a 503.

## Files to Change

### 1. `.github/workflows/deploy-uat.yml` — UAT deployment workflow

#### Change A: Add MISTRAL_API_KEY to resolve-uat-env step (after line 71)

Add variable resolution:
```yaml
UAT_MISTRAL_API_KEY="${{ secrets.UAT_MISTRAL_API_KEY || secrets.MISTRAL_API_KEY }}"
```

Add to GITHUB_OUTPUT block:
```yaml
echo "mistral_api_key=$UAT_MISTRAL_API_KEY"
```

#### Change B: Pass MISTRAL_API_KEY to first Docker run (around line 195)

Add `-e MISTRAL_API_KEY="${{ steps.resolve-uat-env.outputs.mistral_api_key }}"` alongside other `-e` flags.

#### Change C: Pass MISTRAL_API_KEY to second Docker run (around line 249)

Add the same `-e` flag to the final Docker run command.

### 2. `.github/workflows/deploy-hetzner.yml` — Production deployment workflow (preventive)

#### Change D: Pass MISTRAL_API_KEY to first Docker run (around line 144)

Add `-e MISTRAL_API_KEY="${{ secrets.MISTRAL_API_KEY }}"`

#### Change E: Pass MISTRAL_API_KEY to second Docker run (around line 196)

Add the same `-e` flag to the final Docker run command.

## Prerequisites

- GitHub secret `MISTRAL_API_KEY` must exist in the repository (or `UAT_MISTRAL_API_KEY` for UAT-specific key)
- If neither exists, the user must add one before deploying

## Risk Assessment

- **Low risk**: Adding an environment variable to a Docker container does not affect existing functionality
- If the secret is missing, the deployment will not fail (no validation step checks for it), but the 503 will persist
- Recommended: Add validation in the resolve-uat-env step similar to other vars

## Post-Deploy Verification

After deploying, verify the fix by sending a test POST to https://uat.ummahflow.com/api/chat with a valid auth cookie and message body. Expect a non-503 response.
