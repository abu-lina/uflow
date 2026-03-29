---
ID: 064
Origin: 064
UUID: f3a9c2d7
Status: Code Review Approved
---

# Code Review: Plan 064 — Iconify SW CORS Fix

**Plan Reference**: `agent-output/planning/` (no standalone plan doc; scope captured in implementation)
**Implementation Reference**: `agent-output/implementation/064-iconify-sw-cors-fix-impl.md`
**Date**: 2026-03-29
**Reviewer**: Code Reviewer

## Changelog

| Date       | Agent Handoff     | Request                                      | Summary                                         |
|------------|-------------------|----------------------------------------------|-------------------------------------------------|
| 2026-03-29 | Orchestrator → CR | Review commit b791dc74 (nginx + CSP fixes)   | APPROVED — 1 HIGH (working tree divergence) resolved via fix-in-review; 1 LOW finding noted |

---

## Architecture Alignment

**System Architecture Reference**: `agent-output/architecture/system-architecture.md`
**Alignment Status**: ALIGNED

Both changes follow established patterns:

- **nginx**: The `sw-push-handler.js` exact-match block mirrors the existing `sw.js` block verbatim (same proxy headers, same no-cache directive set, same `proxy_hide_header`+explicit `Content-Type` pattern, same comment style). UAT conf mirrors prod conf with the correct `proxy_pass` port difference (3000 → 3001).
- **CSP**: CSP directives follow the principle of least privilege. The CSP builder is already the canonical location for all policy changes; the removal of incorrect origins from `frame-src` is consistent with how the other directives are structured.

---

## TDD Compliance Check

**TDD Table Present**: Yes (in implementation doc)
**All Rows Complete**: Yes (10/10 rows, all ✅ PASS)
**Concerns**: None — coverage is tight and regression-focused. Each test row maps directly to a failure mode from the original bug.

---

## Security Quick Scan

| Check | Result |
|-------|--------|
| No secrets or hardcoded credentials | ✅ Pass |
| No injection risks (nginx conf is static template, no user input) | ✅ Pass |
| CSP change is net security improvement (reduced over-permissive `frame-src`) | ✅ Positive |
| `frame-src 'self'` is correct minimal policy (Iconify only needs `connect-src`) | ✅ Pass |
| Iconify origins correctly retained in `connect-src` and `default-src` | ✅ Pass |
| No CORS misconfiguration introduced | ✅ Pass |

---

## Deployment Path Audit

**Trigger**: Changes touch `deploy/nginx/nginx-template.conf` and `deploy/nginx/nginx-uat-template.conf`.

| Entrypoint checked | Result |
|-------------------|--------|
| `deploy/nginx/nginx-template.conf` — prod `docker run` entrypoint | Block added correctly ✅ |
| `deploy/nginx/nginx-uat-template.conf` — UAT entrypoint | Block added with UAT port (3001) ✅ |
| Port differences prod (3000) vs UAT (3001) preserved across all proxy_pass lines in new block | ✅ |
| No other nginx conf files in `deploy/` | Confirmed ✅ |

---

## Findings

### Critical
None.

### High

**[HIGH] Operational: Working tree diverged from committed HEAD (b791dc74) — resolved via fix-in-review**

- **Location**: All 7 modified/created files from the commit
- **Issue**: After commit `b791dc74` was created, all changes were **reverted in the working tree** as uncommitted modifications. Specifically:
  - `deploy/nginx/nginx-template.conf` — `location = /sw-push-handler.js` block removed
  - `deploy/nginx/nginx-uat-template.conf` — same block removed
  - `next.config.js` — `frame-src` restored to include Iconify domains (bug re-introduced)
  - `package.json` — version downgraded from 0.9.9 → 0.9.8
  - `src/__tests__/config/nginx-config.test.ts` — test file deleted
  - `src/__tests__/config/pwa-config.test.ts` — 2 CSP regression tests removed
  - `agent-output/implementation/064-iconify-sw-cors-fix-impl.md` — implementation doc deleted
- **Root cause**: Likely an accidental `git stash pop` or `git checkout` of a pre-commit stash against the committed working tree. Same failure mode as PI-059 R3 (post-rebase working tree corruption).
- **Resolution (applied via fix-in-review)**: All 7 resources restored to their committed state using file edits. Working tree now matches `b791dc74`. Zero new code — purely restoring reverted content.
- **Verification path for QA**: Run `git status` on the branch. No unstaged changes should appear for these files. Then run `npx vitest run src/__tests__/config/` — all 14 config tests must pass.

### Medium

None.

### Low

**[LOW] Version: `package-lock.json` version not bumped in commit b791dc74**

- **Location**: `package-lock.json` line 3
- **Issue**: `package.json` was bumped to `0.9.9` in the commit, but `package-lock.json` retained `0.9.8` in the committed state. The working tree already has `package-lock.json` at `0.9.9` (it was bumped locally but not staged/committed), so the issue exists only in the git history.
- **Impact**: Cosmetic — `npm install` regenerates the lock file. CI will produce a consistent output. The mismatch doesn't affect runtime behaviour.
- **Recommendation**: DevOps should ensure `package-lock.json` is included in the release commit (it is already correct at `0.9.9` in the working tree).

---

## Code Quality Assessment

### nginx changes

The `sw-push-handler.js` block is a precise, minimal copy of the `sw.js` block, with appropriate adjustments:
- `proxy_pass` target is identical (same upstream port) — ✅
- Comment block is clear, explains the exact failure mode (`importScripts() + immutable cache`) — ✅
- Exact-match `location =` syntax uses nginx's highest-priority location type — ✅
- Positioned **between** `sw.js` block and `/api/manifest` block (before any `~*` regex rules), making cache intent visible — ✅
- No duplication of shared nginx boilerplate introduced — ✅ (headers are per-block intentionally)

### CSP change

The `frame-src` cleanup is correct and well-reasoned:
- `frame-src` governs `<iframe>`/`<frame>` embedding sources exclusively — Iconify APIs serve JSON via `fetch()`, never as embedded frames — ✅
- `"frame-src 'self'"` is the minimum viable policy for this app (no third-party frame embedding required) — ✅
- Inline comment explains the removal rationale (`// Iconify API domains removed from frame-src...`) — ✅
- `connect-src` and `default-src` retain Iconify origins, so icon loading is unaffected — ✅

### Test quality

- **nginx-config.test.ts** (7 tests): Covers block existence, no-cache header set, position before generic JS rule, and absence of `immutable`/`expires 1y`. The newline-prefixed `indexOf` pattern (`'\n    location ~* \\.(js)$'`) correctly avoids false positives from comment text. Tests are well-named and describe the exact failure mode. ✅
- **pwa-config.test.ts additions** (2 tests): Frame-src exclusion check uses `.split('\n').find()` to target the exact directive line — avoids false positives from comment text or other directives that might include the string. Retain-in-connect-src test checks a 400-char slice around the connect-src array start — sufficient coverage. ✅
- Implementation doc TDD table is complete and matches the test cases. ✅

---

## Fix-in-Review Record

| # | Change | Files | Rationale |
|---|--------|-------|-----------|
| FIR-1 | Restored `location = /sw-push-handler.js` block | `deploy/nginx/nginx-template.conf` | Accidentally removed from working tree post-commit |
| FIR-2 | Restored `location = /sw-push-handler.js` block | `deploy/nginx/nginx-uat-template.conf` | Same |
| FIR-3 | Restored `"frame-src 'self'"` with comment | `next.config.js` | Reverted to include Iconify in working tree vs committed `'self'` only |
| FIR-4 | Restored version `0.9.9` | `package.json` | Downgraded in working tree from committed `0.9.9` |
| FIR-5 | Recreated nginx regression tests | `src/__tests__/config/nginx-config.test.ts` | File deleted from working tree; recreated from committed content |
| FIR-6 | Restored 2 CSP regression tests | `src/__tests__/config/pwa-config.test.ts` | Tests removed from working tree; restored from committed content |
| FIR-7 | Restored implementation doc | `agent-output/implementation/064-iconify-sw-cors-fix-impl.md` | Document deleted from working tree; restored from committed content |

All FIR changes restore committed content — no new code, no new decisions, no new tests required.

---

## Deferred Items (from Plan 046 — review does not block on these)

| ID   | Item                                                    | Status   |
|------|---------------------------------------------------------|----------|
| DF-1 | Browser icon rendering on `/providers/[id]` with SW    | Deferred — requires live browser |
| DF-2 | Provider image CacheFirst regression check              | Deferred — requires live browser |
| DF-3 | Push notification handler smoke test                   | Deferred — requires live browser |
| DF-4 | Full production build with valid env vars (CI)         | Deferred — CI gate |

---

## Verdict

**APPROVED**

The committed implementation (`b791dc74`) is correct, minimal, well-tested, and follows established project patterns. The single HIGH finding (working tree divergence) has been resolved via fix-in-review — all 7 affected resources are restored to the committed state. The LOW finding (package-lock.json version in git history) is cosmetic and does not affect runtime.

**QA gate**: Confirm `git status` shows a clean working tree for the modified files, then proceed with test execution and UAT.
