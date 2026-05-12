---
ID: 126
Origin: 126
UUID: a3f2c891
Status: Active
---

# Open Actions 126: Deferred Post-Deploy Follow-ups

## Summary

- Plan 126 attestation display was approved for release with 1 non-blocking MEDIUM finding (DF-1) deferred post-release.
- Release context: v0.12.12

## Open Actions

| Item | Owner | Trigger/Due | Evidence to close | Status |
| ---- | ----- | ----------- | ----------------- | ------ |
| DF-1: UX copy inconsistency — `noProofs` empty-state message renders alongside `AttestationCard` when badges are empty but attestation items exist. Gate the `noProofs` message to only show when `AttestationCard` also renders nothing (add `declaredItems.length === 0` guard in `ProviderDetailSections.tsx`). | Implementer | Post-release follow-up (next available session) | `ProviderDetailSections.tsx` updated — `noProofs` block only shown when both `badges.length === 0` AND no attestation items exist | Open |

## Changelog

| Date (UTC)       | Agent  | Change                                    |
| ---------------- | ------ | ----------------------------------------- |
| 2026-05-12T15:39Z | devops | Created tracker from DF-1 code review deferred finding |
