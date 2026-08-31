---
ID: 198
Origin: 198
UUID: b7e4a1c9
Status: Active
---

# Open Actions 198: Deferred Post-Deploy Follow-ups

## Summary

DF-1 is a live LLM scope validation that cannot be automated — it requires a real LLM call in the production environment to confirm the food-only scoping change is respected. The change itself is textual/structural (system-prompt SCOPE, DB category filter, redirect copy) and is verified at code level; the deferral covers observed LLM runtime behaviour only.

Release/version context: v0.15.2 (chatbot flow improvements, Plan 198).

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|------|-------|------------|-------------------|--------|
| **DF-1**: Live LLM scope validation — open the chatbot on production, tap "Empfehlung erhalten", confirm assistant responds with food/restaurant focus only (no store/ummah/business/social options offered) | DevOps / on-call operator | Within 24h of v0.15.2 deploy | One successful cold conversation (5+ turns) confirming food-only scope; screenshot or session log | Open |

## Notes

- DF-1 residual risk: **MEDIUM** — LLM probabilistically follows instructions; structural guardrails (prompt + DB filter + redirect copy) are in place
- Rollback trigger: if the assistant consistently offers store/ummah options after deploy, revert `src/features/chat/prompts/system-prompt.ts` SCOPE section + `.in('applicable_section', ['food', 'all'])` filter — no DB changes required (reversible per plan D3)
- M2 (machine artifact prefix) and M3 (sessionStorage back-navigation) have NO deferred items — fully covered by automated regression tests

## Changelog

| Date (UTC) | Agent | Change |
|------------|-------|--------|
| 2026-08-02T16:50Z | devops | Created tracker from DF-1 deferred live-LLM validation in UAT report |
