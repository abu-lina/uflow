---
ID: 180
Origin: 180
UUID: d4f9e7c1
Status: Active
---

# Implementation: Fix /api/chat 503 — Add MISTRAL_API_KEY to deployments

## Changelog
| Date | Agent | Change |
|------|-------|--------|
| 2026-06-17 | Implementer | Added MISTRAL_API_KEY to deploy-uat.yml and deploy-hetzner.yml |

## Summary

Added `MISTRAL_API_KEY` environment variable to both UAT and production Docker deployment workflows so the AI provider (Mistral) is configured at runtime.

## Changes Made

### `.github/workflows/deploy-uat.yml`

1. **resolve-uat-env step**: Added variable resolution with UAT-first fallback pattern:
   - `UAT_MISTRAL_API_KEY="${{ secrets.UAT_MISTRAL_API_KEY || secrets.MISTRAL_API_KEY }}"`
   - Added to `$GITHUB_OUTPUT` as `mistral_api_key`

2. **First Docker run** (temp port 3003, blue-green): Added `-e MISTRAL_API_KEY="${{ steps.resolve-uat-env.outputs.mistral_api_key }}"`

3. **Second Docker run** (final port 3001): Added same `-e MISTRAL_API_KEY=...`

### `.github/workflows/deploy-hetzner.yml`

1. **First Docker run** (temp port 3002): Added `-e MISTRAL_API_KEY="${{ secrets.MISTRAL_API_KEY }}"`

2. **Second Docker run** (final port 3000): Added same `-e MISTRAL_API_KEY=...`

## Verification

- Both workflow files parse as valid YAML
- The UAT workflow follows the existing `UAT_` prefix fallback pattern
- The production workflow uses the secret directly (no prefix pattern)
- Variable name `MISTRAL_API_KEY` matches what `src/lib/openrouter.ts` expects

## Prerequisites

- GitHub secret `MISTRAL_API_KEY` (or `UAT_MISTRAL_API_KEY`) must exist in the repository
- If the secret doesn't exist, the variable will be empty and the 503 will persist

## TDD Compliance

| Requirement | Status | Notes |
|------------|--------|-------|
| Tests pass | N/A | No code changes — deployment workflow only |
| Type-check | N/A | No TypeScript changes |
| Lint | N/A | No source code changes |
| YAML syntax | ✅ Valid | Verified by workflow file syntax |
