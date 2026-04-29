---
ID: 109
Origin: 109
UUID: b7e3f91a
Status: Active
---

# Open Actions 109: Deferred Pre-Release Validations

## Summary

Plan 109 (Providers Results Page UI Enhancements) is committed for release v0.10.38.  
Three pre-release validations were deferred from QA/UAT due to environment dependencies (device/browser/Supabase credentials).  
All code-level gates pass (type-check, lint, 1140 tests). Deferred items are visual and environment checks only.

**Risk Level**: LOW for DF-1/DF-2, MEDIUM for DF-3.  
**Release gate**: DF-3 must be closed before Stage 2 push. DF-1/DF-2 are recommended before or concurrent with Stage 2.

---

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
| --- | --- | --- | --- | --- |
| **DF-1**: Mobile viewport rendering validation (375px, 320px, safe-area, truncation, edit button touch target) | DevOps/UAT | Before Stage 2 push (recommended) | Screenshots at 375px and 320px; safe-area padding verified on iOS notch device; edit button tap confirmed | Open |
| **DF-2**: Full browser integration flow validation (/search → /providers → edit back) | DevOps/UAT | Before Stage 2 push (recommended) | URL at step 7 contains `section=food&q=Doener&location=Berlin&wer=...`; screenshot of /providers header with all 3 segments; URL of `/search?section=food` after edit; Food tab active screenshot | Open |
| **DF-3**: Production build validation with real Supabase env | DevOps | Stage 2 pre-requisite (blocking) | `npm run build` exit code 0 with real `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`; no new errors | Open |

---

## Detail

### DF-1: Mobile Viewport Rendering

**Rationale for deferral**: QA/UAT environments lack physical mobile device or browser viewport access. CSS is static Tailwind classes; rendering logic is comprehensively tested via unit tests.

**Scenarios to validate**:
1. Load `/providers?section=food&q=Doener&location=Berlin&wer=2+Maenner` on 375px viewport
2. Verify header shows `[Icon] Doener · Berlin · 2 Männer [Edit button]` layout
3. Verify text truncates on 320px (no overflow)
4. Verify safe-area padding on iOS notch device (≥24px above content)
5. Verify edit button is right-aligned with touch target ≥6x6pt

**Fallback**: If deferred past release, accept and monitor production user feedback (low likelihood of issue given Tailwind static classes).

---

### DF-2: Full Browser Integration Flow

**Rationale for deferral**: Requires running dev server. URL transport and component wiring are comprehensively covered by automated regression tests.

**Flow to validate**:
1. `/search` page → select Food section, city Berlin, audience 2 Männer, search term Doner
2. Submit → confirm URL: `?section=food&q=Doener&location=Berlin&wer=2+Maenner%2C+1+Kind`
3. Confirm header on `/providers` shows all 3 context segments with section icon
4. Click edit button → confirm navigation to `/search?section=food`
5. Confirm Food tab is active on `/search`

**Fallback**: If deferred past release, accept and monitor production (low likelihood — regression test covers exact URL formation).

---

### DF-3: Production Build Gate

**Rationale for deferral**: Local environment lacks real Supabase credentials. `npm run build` fails at page-data collection for routes that validate env at build time. All code-level gates (type-check, lint, tests) pass.

**Command**:
```bash
NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... npm run build
```

**Blocker status**: ⚠️ **Required before Stage 2 push**. Must be confirmed by DevOps in an environment with valid credentials (CI/CD pipeline or Hetzner server).

**Fallback**: None — this is a hard gate for production deployment.

---

## Changelog

| Date (UTC) | Agent | Change |
| --- | --- | --- |
| 2026-04-27T20:40Z | devops | Created tracker from deferred UAT validations DF-1, DF-2, DF-3 at Stage 1 commit |
| 2026-04-28T16:50Z | implementer | Corrected status from QA Complete to Active pending formal QA gate |
