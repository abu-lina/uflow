---
ID: 076
Origin: 076
UUID: b4e8f21a
Status: Active
---

# Open Actions 076 (bg-footer-scroll-v2): Deferred Post-Deploy Follow-ups

## Summary

- Why deferred: iOS Safari compositor/overscroll behavior cannot be confirmed in jsdom or desktop dev tools. Physical iPhone SE and iPhone 16 Pro are required. QA and UAT accepted this under the CSS-only exception pattern.
- Release context: Plan 076 (iOS footer CTA overlay fix v2) targeting v0.10.5.
- Note: A separate `076-open-actions.md` file exists on `origin/main` (UUID: c94b9360) for the parallel Plan 076 desktop provider detail fixes (v0.10.4). This file tracks the iOS scroll fix deferred items only and uses a distinct filename to avoid merge collision.

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
|---|---|---|---|---|
| DF-1: Physical iOS runtime confirmation — provider detail page overscroll | UAT / device owner | Before production cutover or within 24h post-release | iPhone SE Safari: drag past scroll boundary on `/providers/[id]`, CTA remains unobscured; screen capture | Open |
| DF-1: Physical iOS runtime confirmation — provider card modal path | UAT / device owner | Before production cutover or within 24h post-release | iPhone 16 Pro Safari: same overscroll gesture in ProviderCardModal; screen capture | Open |
| DF-1: Gradient fill visual check | UAT / device owner | Same session as device testing | Open a provider with no offers/needs (minimal content); confirm `flex-1` gradient fills full viewport without cutoff | Open |
| CODE-REVIEW-LOW: Cosmetic indentation in ProviderDetailPage.tsx | Future maintainer | Next touch of that file | Run prettier/formatter pass on L334-L589 to normalise 8-vs-10-space indent inconsistency (non-blocking) | Open |

## Changelog

| Date (UTC) | Agent | Change |
|---|---|---|
| 2026-04-03T16:55Z | devops | Created tracker from deferred UAT DF-1 items and code-review LOW finding |
