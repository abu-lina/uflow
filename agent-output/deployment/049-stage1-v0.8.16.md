---
ID: 49
Origin: 49
UUID: 7dfe4b10
Status: Stage1-Committed
---

# Deployment: Plan 049 — UFlow Security Remediation (Stage 1)

**Plan Reference**: `agent-output/planning/closed/049-security-remediation-plan.md`
**UAT Reference**: `agent-output/uat/closed/049-security-remediation-uat.md`
**Target Version**: v0.8.16
**Stage**: Stage 1 — Local Commit (no push)
**Date**: 2026-03-23

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-03-23T00:00Z | devops | Stage 1 deployment doc created; local commit for v0.8.16 |

---

## Plan Reference

- Plan 049: UFlow Security Remediation
- UAT Verdict: APPROVED FOR RELEASE
- QA Status: QA Complete
- Standalone release (no bundled plans)

---

## Release Summary

| Field | Value |
|---|---|
| Version | v0.8.16 |
| Type | Security patch |
| Environment | Production + UAT |
| Epic | Platform security hardening |
| Plans included | 049 |

---

## Pre-Release Verification

### UAT/QA Approval

- ✅ QA Status: QA Complete (`agent-output/qa/closed/049-security-remediation-qa.md`)
- ✅ UAT Verdict: APPROVED FOR RELEASE (`agent-output/uat/closed/049-security-remediation-uat.md`)
- ✅ Post-UAT delta check: No code changes after UAT approval. The QA-fix round auth.ts changes were part of the QA re-run which UAT reviewed and approved.

### Version Consistency

- ✅ `package.json`: Updated `0.8.7` → `0.8.16`
- ✅ `CHANGELOG.md`: `[0.8.16] - 2026-03-23` entry added
- ✅ `package-lock.json`: Synced with `npm install --package-lock-only`
- ✅ Target Release field in plan updated to v0.8.16

**Version collision resolution**: Tags `v0.8.13`, `v0.8.14`, `v0.8.15` and `origin/main` package.json version `0.8.15` all pre-existed on `origin` at Stage 1 pre-flight. This worktree (`session/049-security-audit`) was branched at commit `59036f7` which corresponds to v0.8.7. Origin/main advanced 37 commits to v0.8.15 in parallel sessions during the lifecycle of this plan. Next available patch is `v0.8.16`.

### CHANGELOG Date Sanity Check

- ✅ New entry dated `2026-03-23` (today per context). Consistent with prior entries pattern (`2026-03-19` for v0.8.7).

### .gitignore Review

- ✅ `**/public/fallback-development.js` — dev-only PWA fallback correctly gitignored
- ✅ No unexpected new ignores required for Plan 049 changes
- No .gitignore changes proposed

### PWA Dev-Artifact Check

- ✅ `public/fallback-ce627215c0e4a9af.js` — production fallback present and unmodified
- ✅ `public/fallback-development.js` — not present (correctly gitignored)
- ✅ No dev server ran during this session; no PWA artifact contamination

### Packaging Integrity

Staged file set (modified + untracked):

**Source files (security fixes)**:
- `.github/workflows/deploy-hetzner.yml` — ADMIN_DEBUG_KEY wired (H1 fix-in-review)
- `.github/workflows/deploy-uat.yml` — ADMIN_DEBUG_KEY wired (H1 fix-in-review)
- `CHANGELOG.md` — v0.8.16 entry added
- `docs/guides/MANAGE_BLOCKED_IPS.md` — stale note updated
- `env.production.template` — ADMIN_DEBUG_KEY added
- `env.uat.template` — ADMIN_DEBUG_KEY added
- `next.config.js` — CSP header restored (F-049-06)
- `package-lock.json` — Next.js 15.5.14 + lockfile sync
- `package.json` — version 0.8.16
- `src/app/api/admin/set-role/route.ts` — isAdminOrModerator() gate (F-049-01)
- `src/app/api/auth/debug-ip-status/route.ts` — debug key fallback removed (F-049-03)
- `src/app/api/auth/magic-link-diagnostic/route.ts` — debug key fallback removed (F-049-03)
- `src/app/api/check-email-exists/route.ts` — enumeration-safe responses (F-049-04)
- `src/app/api/generate-confirmation-token/route.ts` — rate limit + PII removal (F-049-02, F-049-12)
- `src/app/api/instagram/scrape/route.ts` — username validation (F-049-07)
- `src/app/api/outreach/action/route.ts` — centralized admin client (F-049-13)
- `src/app/api/outreach/claim/route.ts` — centralized admin client (F-049-13)
- `src/app/api/push/send/route.ts` — DB-backed auth (F-049-05)
- `src/app/api/send-auth-email/route.ts` — rate limit + server URL (F-049-02)
- `src/lib/auth.ts` — caller contract fix for F-049-04

**Tests**:
- `src/__tests__/api/security-049-regression.test.ts` — 12 route-level regression tests
- `src/__tests__/lib/auth-check-email-callers.test.ts` — 4 caller-level regression tests

**Agent-output docs** (lifecycle: Committed → closed/):
- `agent-output/planning/closed/049-security-remediation-plan.md`
- `agent-output/implementation/closed/049-security-remediation-implementation.md`
- `agent-output/code-review/closed/049-security-remediation-code-review.md`
- `agent-output/qa/closed/049-security-remediation-qa.md`
- `agent-output/uat/closed/049-security-remediation-uat.md`
- `agent-output/security/049-full-security-audit-v0.8.7.md` (committed as-is; security docs not closed by DevOps)
- `agent-output/critiques/049-security-remediation-plan-critique.md` (committed as-is; status OPEN — closed by Critic)

**Other**:
- `memories/` — repo-scoped memory notes
- `agent-output/deployment/049-stage1-v0.8.16.md` (this file)
- `agent-output/planning/049-open-actions.md` — deferred post-deploy tracker

### Workspace Cleanliness

- ✅ No uncommitted changes beyond Plan 049 scope
- ✅ No unrelated files staged

---

## Stage 1 Evidence

### git status (pre-commit)

```
On branch session/049-security-audit
Changes not staged for commit:
  modified:   .github/workflows/deploy-hetzner.yml
  modified:   .github/workflows/deploy-uat.yml
  modified:   CHANGELOG.md
  modified:   docs/guides/MANAGE_BLOCKED_IPS.md
  modified:   env.production.template
  modified:   env.uat.template
  modified:   next.config.js
  modified:   package-lock.json
  modified:   package.json
  modified:   src/app/api/admin/set-role/route.ts
  modified:   src/app/api/auth/debug-ip-status/route.ts
  modified:   src/app/api/auth/magic-link-diagnostic/route.ts
  modified:   src/app/api/check-email-exists/route.ts
  modified:   src/app/api/generate-confirmation-token/route.ts
  modified:   src/app/api/instagram/scrape/route.ts
  modified:   src/app/api/outreach/action/route.ts
  modified:   src/app/api/outreach/claim/route.ts
  modified:   src/app/api/push/send/route.ts
  modified:   src/app/api/send-auth-email/route.ts
  modified:   src/lib/auth.ts

Untracked files:
  agent-output/code-review/049-security-remediation-code-review.md
  agent-output/critiques/049-security-remediation-plan-critique.md
  agent-output/implementation/049-security-remediation-implementation.md
  agent-output/planning/049-security-remediation-plan.md
  agent-output/qa/049-security-remediation-qa.md
  agent-output/security/049-full-security-audit-v0.8.7.md
  agent-output/uat/049-security-remediation-uat.md
  memories/
  src/__tests__/api/security-049-regression.test.ts
  src/__tests__/lib/auth-check-email-callers.test.ts
```

### Automated Gate Results (executed 2026-03-22T21:23Z)

```
vitest run: 315 passed | 18 skipped (37 test files) — 0 failures
tsc --noEmit: 0 errors
eslint [all modified files]: 0 errors
npm audit: 0 vulnerabilities
```

---

## Known Limitations (Pre-Operation)

| Limitation | Owner | Trigger/Due | Evidence to Close |
|---|---|---|---|
| Interactive browser validation not yet executed | QA Lead | First 24h post-deploy | Manual test notes: confirmed-user login `/login`, unconfirmed-user login, forgot-password `/forgot-password`, resend confirmation |
| `check-email-exists` uses local rate limit Map (pre-existing tech debt) | Implementer | Next sprint | PR migrating to shared `@/lib/rate-limit` utility |
| `ADMIN_DEBUG_KEY` GitHub Secret not yet set | Ops | Before first deploy | Confirm secret set in GitHub repo settings |

See `agent-output/planning/049-open-actions.md` for tracked deferred items.

---

## User Confirmation

*Stage 1 does not require user confirmation. User confirmation is required at Stage 2 (release execution/push).*

---

## Release Execution

*Deferred to Stage 2. No push executed in Stage 1.*

---

## Post-Release Status

*Pending Stage 2.*

---

## Deployment History Entry

```json
{
  "plan": "049",
  "version": "v0.8.16",
  "stage": "Stage1-Committed",
  "date": "2026-03-23",
  "environment": "local",
  "status": "Committed — awaiting Stage 2 approval",
  "included_plans": ["049"],
  "notes": "Version collision v0.8.13–v0.8.15; bumped to v0.8.16 at Stage 1 pre-flight"
}
```

---

## Next Actions

1. **Ops**: Add `ADMIN_DEBUG_KEY` (and optionally `UAT_ADMIN_DEBUG_KEY`) to GitHub repository secrets before first deploy
2. **DevOps Stage 2**: When user approves release, run:
   - `git fetch origin --prune --tags` (verify no further tag collisions)
   - `git push origin session/049-security-audit`
   - Create PR from `session/049-security-audit` → `main` (or merge directly per project workflow)
   - Tag: `git tag -a v0.8.16 -m "Release v0.8.16 — UFlow Security Remediation (Plan 049)"`
   - Push tag: `git push origin v0.8.16`
   - Verify deployment health at `/api/health`
3. **QA Lead**: Within 24h of production deploy, execute browser validation checklist (see deferred tracker)
