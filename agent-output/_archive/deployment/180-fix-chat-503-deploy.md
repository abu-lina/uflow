---
ID: 180
Origin: 180
UUID: a1f4e6c2
Status: Active
---

# Deployment: Fix /api/chat 503 — Add MISTRAL_API_KEY to deployments

## Changelog
| Date | Agent | Change |
|------|-------|--------|
| 2026-06-17 | DevOps | Deployment prepared — awaiting user confirmation |

## Changes Ready for Deployment

### Files Modified
- `.github/workflows/deploy-uat.yml` — 4 insertions (UAT)
- `.github/workflows/deploy-hetzner.yml` — 2 insertions (production)

### Branch
`fix/180-chat-503-missing-mistral-key`

## Prerequisites

Before the fix takes effect, the following GitHub secret must exist:
- `MISTRAL_API_KEY` (shared) or `UAT_MISTRAL_API_KEY` (UAT-specific)

## Deployment Steps

1. Merge `fix/180-chat-503-missing-mistral-key` into `main`
2. UAT auto-deploys via `deploy-uat.yml` (push to main triggers it)
3. Verify by POSTing to `https://uat.ummahflow.com/api/chat` — should no longer return 503
4. For production: when ready, manually trigger `deploy-hetzner.yml`

## Verification Plan

After deployment:
```bash
# Test that chat endpoint works (with valid auth token)
curl -X POST https://uat.ummahflow.com/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=..." \
  -d '{"message": "Hallo"}'
# Expected: non-503 response (200 with SSE stream or JSON response)
```
