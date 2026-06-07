# Code Review: Remove Deprecated "Wir bieten / Wir suchen" Sections

**Plan ID:** 154  
**Phase:** 4 of 6 — Code Reviewer  
**Reviewer:** opencode  
**Date:** 2026-06-07  
**Commit:** `HEAD` (multi-location + offers/needs removal)

---

## Files Reviewed

| File | Changed? | Status |
|------|----------|--------|
| `src/components/providers/ProviderDetailPage.tsx` | Yes | ✅ Clean — both mobile and desktop deprecated sections removed |
| `src/components/providers/ProviderDetailModal.tsx` | Yes | ✅ Clean — deprecated sections removed |
| `src/components/community-services/CommunityServiceDetailModal.tsx` | No (already clean) | ✅ No deprecated sections present |
| `src/components/providers/MobileProviderDetail.tsx` | Yes (unrelated) | ✅ No offers/needs changes (multi-location only) |
| `src/translations/de.ts` | Yes | ✅ `weOffer`, `weNeed`, `weAreLookingFor` removed |
| `src/translations/en.ts` | Yes | ✅ Same |
| `src/translations/ar.ts` | Yes | ✅ Same |
| `src/translations/tr.ts` | Yes | ✅ Same |
| `src/translations/ur.ts` | Yes | ✅ Same |
| `src/translations/ps.ts` | Yes | ✅ Same |
| `src/constants/translation-keys.ts` | Yes (prior commit) | ✅ No `WE_OFFER` or `WE_NEED` constants exist |
| `src/features/providers/components/ProviderDetailSections.tsx` | Yes (unrelated) | ✅ PRESERVED — Menu/Angebote sections intact |

---

## Findings

### 1. Component removals are correct

**ProviderDetailPage.tsx** — The sections matching `t('providers.weOffer')` and `t('providers.weAreLookingFor')` in the old file (lines 524, 563 for mobile; 960, 999 for desktop) have been removed. Both mobile `mx-6 mt-4 rounded-2xl bg-white shadow-sm` accordion and the desktop section are gone.

**ProviderDetailModal.tsx** — The same accordion sections have been removed from the modal view.

**CommunityServiceDetailModal.tsx** — Already had no offers/needs accordion UI. The file passes `offers_ids`/`needs_ids`/`offers`/`needs` in a `providerForMobile` data shape (line 286-289), which is data handoff to `MobileProviderDetail`, not the deprecated UI. No change needed.

### 2. Unused imports / state

No orphaned imports or state variables were left behind. The only import changes in the modified files are additions (`useMemo`, `useSearchParams`, `usePathname`, `Location` type) for the multi-location feature — not related to this removal.

### 3. ProviderDetailSections.tsx is preserved

The Menu (food) and Angebote (store) sections remain intact at lines 231-245. All other sections (Values & Amenities, Opening Hours, Proof Tier, Nearby) are also present. The only changes to this file are multi-location additions.

### 4. Translation keys cleaned up

All 6 language files had the 3 keys removed. Zero remaining references found:

```
grep -rn "weOffer\|weNeed\|weAreLookingFor\|WE_OFFER\|WE_NEED" src/ → No matches
grep -rn "Wir bieten\|Wir suchen\|Wir brauchen" src/ → No matches
```

### 5. Type check

`npx tsc --noEmit` — passes with zero errors.

---

## Verdict

**APPROVED**

Nothing to flag. The deprecated sections are fully removed, the correct Menu/Angebote sections are preserved, no dangling references exist, and the codebase compiles cleanly.
