---
ID: 180
Origin: 180
UUID: a7d93e2b
Status: Active
---

# Analysis: /api/chat 503 on UAT

## Changelog
| Date | Agent | Change |
|------|-------|--------|
| 2026-06-17 | Analyst | Initial analysis | ID 180 |

## Value Statement & Objective

The chat feature (Plan 176) was recently merged and deployed to UAT. Users cannot use the chatbot on https://uat.ummahflow.com because every POST to `/api/chat` returns a 503 error. This blocks UAT validation of the entire chat feature before production release.

## Context

- **Endpoint**: `POST /api/chat`
- **Environment**: UAT (https://uat.ummahflow.com)
- **Error response**: `{"error":"Chat service is temporarily unavailable. Please try again later."}`
- **Response status**: 503
- **Feature**: Chatbot (PR #253, feature/176-chatbot) — recently merged to main

## Methodology

- **Code reading**: Trace the 503 response back through the API handler to identify which failure mode was triggered
- **Deployment config inspection**: Compare the UAT deployment workflow with the required runtime environment variables
- **Component isolation**: Identify which specific dependency causes the 503

## Findings

### Finding 1: 503 error originates from catch block in route.ts

**Confidence**: Proven  
**Evidence**: The response body `"Chat service is temporarily unavailable. Please try again later."` matches exactly the error message at line 583 in `src/app/api/chat/route.ts`:

```javascript
if (message.includes('API error') || message.includes('fetch') || message.includes('No AI provider')) {
  return NextResponse.json(
    { error: 'Chat service is temporarily unavailable. Please try again later.' },
    { status: 503, ... }
  );
}
```

### Finding 2: The 503 is triggered by "No AI provider" error

**Confidence**: Proven  
**Evidence**: `src/lib/openrouter.ts` line 56 throws `new Error('No AI provider configured. Set MISTRAL_API_KEY or OPENROUTER_API_KEY.')` when neither API key environment variable is set. This matches the catch condition at route.ts line 581 (`message.includes('No AI provider')`).

This error is thrown by `getLLMConfig()` which is called at the start of both:
- `sendChatRequest()` (line 64 in openrouter.ts) — called at route.ts line 268
- `streamChatCompletion()` (line 147 in openrouter.ts) — called at route.ts lines 370 and 442

### Finding 3: MISTRAL_API_KEY is NOT passed to the UAT Docker container

**Confidence**: Proven  
**Evidence**: In `.github/workflows/deploy-uat.yml`, the `resolve-uat-env` step (lines 59-88) resolves these environment variables:
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, TURNSTILE keys, SERVICE_ROLE_KEY, RESEND_API_KEY, TEST_API_KEY, ADMIN_DEBUG_KEY, FEATURE_ISAPPLAUNCHED

**There is NO resolution of MISTRAL_API_KEY or OPENROUTER_API_KEY.**

The Docker run commands (lines 190-205 and 244-259) pass only the above variables via `-e` flags. Neither `MISTRAL_API_KEY` nor `OPENROUTER_API_KEY` is included.

### Finding 4: Production deployment has the same gap

**Confidence**: Proven  
**Evidence**: In `.github/workflows/deploy-hetzner.yml`, the Docker run commands (lines 140-154 and 193-207) also do NOT include `MISTRAL_API_KEY` or `OPENROUTER_API_KEY`.

### Finding 5: The error is not from Supabase or other dependencies

**Confidence**: Proven  
**Evidence**: 
- `getSupabaseAdmin()` in `src/lib/supabase/admin.ts` — this would throw `"Missing Supabase environment variables"` which does NOT match any of the 503 trigger patterns (no 'API error', 'fetch', or 'No AI provider'). It would instead return a 500.
- Rate limiting throws no error in normal conditions.
- The `buildSystemPrompt()` calls Supabase but that would also not match the 503 trigger patterns.

So the Supabase-related errors would result in a 500, not 503. The 503 response specifically comes from the 503-triggering catch block at line 581-586.

## Root Cause

**The UAT Docker container is deployed without `MISTRAL_API_KEY` (or `OPENROUTER_API_KEY`) environment variable.** When the chat API handler calls `sendChatRequest()` from `@/lib/openrouter`, the `getLLMConfig()` function finds neither API key configured, throws `'No AI provider configured'`, which is caught by the catch block in `route.ts` that matches on `'No AI provider'` and returns a 503 status with "Chat service is temporarily unavailable".

## Affected Environments

| Environment | Affected | Evidence |
|-------------|----------|----------|
| UAT (uat.ummahflow.com) | ✅ Yes | User reports 503; deploy-uat.yml missing MISTRAL_API_KEY |
| Production (ummahflow.com) | ✅ Yes (latent) | deploy-hetzner.yml also missing MISTRAL_API_KEY — will fail when production deploys chat |

## Gap Tracking

| # | Unknown | Blocker | Required Action |
|---|---------|---------|-----------------|
| 1 | Does the `MISTRAL_API_KEY` secret exist in the GitHub repository? | Cannot check — no access to GitHub secrets | User to verify that `secrets.MISTRAL_API_KEY` (or `secrets.UAT_MISTRAL_API_KEY`) exists |
| 2 | Does UAT use Mistral or OpenRouter as the AI provider? | Unknown which key to add | Verify during deployment; openrouter.ts supports both |

## Analysis Recommendations

1. Add `MISTRAL_API_KEY` to the `resolve-uat-env` step in deploy-uat.yml (following the pattern: `secrets.UAT_MISTRAL_API_KEY || secrets.MISTRAL_API_KEY`)
2. Add `-e MISTRAL_API_KEY="${{ steps.resolve-uat-env.outputs.mistral_api_key }}"` to both Docker run commands in deploy-uat.yml
3. Apply the same fix to deploy-hetzner.yml for production readiness
4. User should verify these GitHub secrets exist before deploying
