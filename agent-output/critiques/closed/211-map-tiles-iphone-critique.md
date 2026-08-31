---
ID: 211
Origin: 211
UUID: b7e2d4f1
Status: Resolved
---

# Critique 211 — Map Tiles Not Rendering on iPhone (Plan 208 Regression Fix)

## Changelog

| Date              | Agent   | Request                       | Summary                                           |
| ----------------- | ------- | ----------------------------- | ------------------------------------------------- |
| 2026-08-16T01:00Z | critic  | Initial review                | APPROVED — one MEDIUM advisory, three LOWs noted; no plan revision required |

---

## Artifact

**Plan**: `agent-output/planning/211-map-tiles-iphone-fix.md`
**Analysis**: `agent-output/analysis/closed/211-map-tiles-iphone-analysis.md`
**GitHub Issue**: https://github.com/abu-lina/uflow/issues/313

---

## Value Statement Assessment ✅

> *"As a UFlow user on iPhone, I want the search map to display streets and buildings when I zoom in, so that I can navigate to food providers using the visual map context I expect from a map feature."*

**Presence**: Clear user story format with explicit "so that" outcome. ✅  
**Clarity**: "Streets and buildings visible when zoomed in" is directly verifiable on-device. ✅  
**Alignment**: Mobile map is central to the community directory use case. Direct value delivered. ✅  
**Directness**: Fix is delivered immediately — no deferral, no workaround. ✅

---

## Overview

Plan 211 is a tightly scoped 3-file hotfix addressing a Plan 208 regression where iOS Safari/WebKit fails to render OSM map tiles. Root cause was identified by the Analyst: a PWA Service Worker CacheFirst route intercepts all `.png` image URLs (including tile URLs), and combined with an unnecessary `crossOrigin: 'anonymous'` attribute, causes silent cache failures under concurrent tile loading on WebKit.

This is the second occurrence of the same bug class (Plan 046 — Iconify CDN intercepted by SW), making the fix pattern well-understood and low-risk.

The plan is clean: 7 resolved decisions, a dependency graph, per-milestone acceptance criteria, version bump specified, and a regression test strategy that follows the established pre-fix/post-fix naming convention.

---

## Architectural Alignment ✅

| Check | Assessment |
|-------|-----------|
| Consistent with PWA architecture | Fix applies the same principle established in Plan 046 and documented in `next.config.js` comments. No new pattern introduced. ✅ |
| No premature abstraction | One-line regex change. YAGNI respected. ✅ |
| No library additions | No new dependencies. ✅ |
| Supabase-first philosophy preserved | Fix scopes the image cache to Supabase storage — the intent of the original pattern. ✅ |
| CSP improvement | Replaces an incorrect domain (`tile.openstreetmap.org`) with the actual one (`.de`). Defense-in-depth improved. ✅ |

---

## Scope Assessment ✅

The scope is appropriately minimal for a regression hotfix. Three files, five milestones, one new test file. The plan correctly defers the CSS filter (F6) to QA investigation rather than adding it to implementation scope. The W3 finding (auditing all SW-pattern catches) is deferred to a future plan with explicit notation.

---

## Technical Debt Risks

**Reduced by this plan**: The narrowed SW regex (M1) eliminates the second instance of the W1 weakness (overly broad image cache pattern). Combined with Plan 046 which eliminated the Iconify variant, this closes the known surface area of this pattern.

**Introduced by this plan**: None.

**Residual debt**: W3 (other cross-origin `.png` resources caught by the old pattern) remains unaudited. Acknowledged as deferred, non-blocking.

---

## Hotfix Production Scenario Check

*"How will this plan result in a hotfix after deployment?"*

Deployment path: commit → CI → deploy to UAT → on-device QA → UAT sign-off → deploy to production → tag v0.15.13.

**Post-deployment edge cases assessed**:

1. **SW stale cache on user devices**: `skipWaiting: true` is configured in `next.config.js` — the new SW activates on next navigation. Old cached tile entries in the `images-cache` bucket will naturally expire (30-day TTL) or be evicted as the new SW drops the tile URL pattern. No user action required. ✅

2. **Provider photos still cached after regex narrowing**: The new pattern `^https:\/\/[^/]*\.supabase\.co\/.*\.(png|jpg|jpeg|svg|gif)(\?.*)?$` covers standard Supabase storage URLs with or without transform query params. Standard format `https://[ref].supabase.co/storage/v1/object/public/path.jpg?width=400` matches correctly. The pattern does not cover Supabase's `/render/image/` transformation endpoint (no file extension in URL), but that was also uncovered by the original broad regex — not a new regression.

3. **UAT tester SW stale**: Risk is acknowledged in the plan. `skipWaiting: true` handles automatic activation; a hard reload confirms it. DevOps deployment note is appropriate.

---

## Open Questions Check ✅

No `OPEN QUESTION` markers found in plan. All 7 Decision Record entries are `[RESOLVED]`. Plan may proceed without open-question acknowledgement gate.

---

## Decision Record Check ✅

All 7 decisions marked `[RESOLVED]`. No `[OPEN]` or `[DEFERRED]` entries. D4 (keep CSS filter pending QA) and D6 (on-device UAT mandatory) are notable and well-reasoned.

---

## Duration Estimates Check ✅

Duration Estimates section present. Estimates are credible for a 3-file change (total ~3–4 hrs). On-device QA is correctly identified as the main uncertainty driver.

---

## Findings

| # | Title | Severity | Status | Description | Impact | Recommendation |
|---|-------|----------|--------|-------------|--------|----------------|
| F1 | Provider-image QA scenario absent from Testing Strategy | MEDIUM | OPEN | The Testing Strategy lists 6 on-device scenarios (all tile-focused). The risk table states "QA tests provider images (Supabase) still load" as the mitigation for M1's narrowed regex — but no named scenario operationalises this. M1 is the highest-risk change: an overly narrow Supabase regex could silently break provider photo caching. | Provider photos appear broken in production after release; discovered after release, not during QA. | Implementer must add an explicit note to the QA handoff: "QA Scenario 7 — verify provider photos load correctly on device (e.g., navigate to a provider detail page with photos; confirm images display without errors)." No plan revision required; this is a QA handoff obligation. |
| F2 | M1 milestone is slightly prescriptive (exact regex in plan body) | LOW | RESOLVED | M1 specifies the exact replacement regex (`^https:\/\/[^/]*\.supabase\.co\/.*\.(?:png|jpg|jpeg|svg|gif)(\?.*)?$`). This crosses the WHAT/WHY boundary into HOW. | Minimal impact — the regex is a one-line config value and precision aids correctness verification. | Acceptable for this scope; no action required. Noted for process improvement: plans may specify regex shape/intent rather than exact syntax. |
| F3 | Analysis artifact path reference in plan is stale | LOW | RESOLVED | Plan body references `agent-output/analysis/211-map-tiles-iphone-analysis.md` but Planner moved it to `agent-output/analysis/closed/211-map-tiles-iphone-analysis.md` during planning closure. | Implementer clicking the link will find a missing file and have to search in `closed/`. | Informational — the correct path is `agent-output/analysis/closed/211-map-tiles-iphone-analysis.md`. Implementer note only. |
| F4 | Planner chatmode file absent | LOW | RESOLVED | `.github/chatmodes/planner.chatmode.md` does not exist in this workspace. Process gap. | Minor — agents must rely on copilot-instructions.md for planner conventions without a dedicated chatmode definition. | Create `.github/chatmodes/planner.chatmode.md` in a future housekeeping task. Out of scope for this bugfix. |

---

## Risk Assessment

The plan's risk table covers the four relevant risks adequately. No additional architectural risks identified. The tile server usage policy risk is LOW and well-mitigated (public OSM server, attribution present, policy reviewed). 

The only gap is the F1 MEDIUM finding above, which is resolvable at handoff time without a plan revision.

---

## Recommendations

1. **Implementer action (REQUIRED)**: Add a 7th QA scenario to the handoff notes: "*QA Scenario 7 — Navigate to a food provider with images on device; verify provider photos load and display without errors (confirms Supabase-scoped SW regex still caches provider images).*"

2. **Implementer action (recommended)**: When writing M4 regression test, add a third regex test case for a Supabase URL with transform query params (e.g., `https://xyz.supabase.co/storage/v1/object/public/p.jpg?width=400`) to make the Supabase coverage explicit in the test suite.

3. **Future housekeeping** (out of scope): Create `.github/chatmodes/planner.chatmode.md`.

---

## Revision History

| Version | Date              | Changes | Findings Addressed | New Findings | Status Change |
|---------|-----------------|---------|--------------------|--------------|---------------|
| Initial | 2026-08-16T01:00Z | First review | — | F1 MEDIUM, F2–F4 LOW | OPEN → Resolved (APPROVED) |

---

## Verdict

**APPROVED**

The plan is structurally sound, correctly diagnoses an L2 root cause, makes the minimum necessary fix to address it, and documents all decisions. The single MEDIUM finding (F1) is an advisory gap in the QA Testing Strategy; it is resolved by a handoff note and does not require a plan revision. All LOW findings are informational.

**Gate cleared**: Implementer may proceed.
