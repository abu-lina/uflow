---
ID: 180
Origin: 180
UUID: e5f2a8d3
Status: Active
---

# Code Review: Fix /api/chat 503 — Add MISTRAL_API_KEY to deployments

## Changelog
| Date | Agent | Change |
|------|-------|--------|
| 2026-06-17 | Code Reviewer | Initial review — APPROVED |

## Review Scope

- `.github/workflows/deploy-uat.yml` — 4 insertions
- `.github/workflows/deploy-hetzner.yml` — 2 insertions

## Review Checklist

### Security
- ✅ Environment variable references GitHub secrets only (no hardcoded values)
- ✅ Secret name follows existing `UAT_` prefix convention
- ✅ No exposure of sensitive values in workflow logs (secret masking by GitHub Actions)

### Correctness
- ✅ Variable name `MISTRAL_API_KEY` matches what `src/lib/openrouter.ts:36` expects (`process.env.MISTRAL_API_KEY`)
- ✅ UAT follows the existing `secrets.UAT_* || secrets.*` fallback pattern
- ✅ Production uses direct secret reference (consistent with existing patterns)
- ✅ Valid YAML syntax — all continuation lines end with `\` without trailing whitespace
- ✅ Env var added to BOTH Docker run commands (blue-green temp port and final port) in both workflows

### Completeness
- ✅ UAT: resolve step + GITHUB_OUTPUT + both Docker runs
- ✅ Production: both Docker runs
- ✅ Default model (`mistral-small-latest`) is used when `MISTRAL_MODEL` is not set — no additional var needed

### Pre-existing Issues (Out of Scope)
- Neither workflow validates whether the MISTRAL_API_KEY secret actually exists at deploy time (same pattern as other optional vars like RESEND_API_KEY)
- If the secret is missing, the env var will be empty and the 503 will persist — this is a documentation/ops concern, not a code issue

## Verdict

**APPROVED** ✅

The changes are minimal, follow existing conventions, and correctly resolve the root cause. No architectural concerns or regressions introduced.
