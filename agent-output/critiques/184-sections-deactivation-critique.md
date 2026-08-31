---
ID: 184
Origin: 184
UUID: 741597c1
Status: Active
---

# Architecture Critique: Deactivate ummah and stores sections

## 1. Changelog

| Date | Agent | Summary |
|---|---|---|
| 2026-06-17 | Architect | Reviewed plan against codebase; found 2 conditions, 2 recommendations |

## 2. Verdict

**APPROVED WITH CONDITIONS**

## 3. Review Summary

Reviewed the deactivation plan against 13 source files. The config-driven `SECTION_META` approach is architecturally sound and consistent with the existing `SECTION_FILTER_CONFIG` pattern. The plan covers most consumers. Two blocking issues found — both in the `providers/page.tsx` server component, which is the only entry point that independently resolves sections from URL params without passing through the route-page redirect layer. Three structural improvements also identified.

## 4. Positive Findings

- **Config-driven approach fits well.** `SECTION_META` mirrors the existing `SECTION_FILTER_CONFIG` pattern. Same file, same `Record<Section, T>` shape, same import path. No new pattern introduced.

- **SectionSelector change covers all instances.** Modifying `SectionSelector` once (Step 3) propagates disabled tabs + badges to every usage — `Header.tsx`, `search/page.tsx`, `ProvidersPageHeader.tsx`, `RootPageContent.tsx`. No need for per-instance changes.

- **Defense-in-depth strategy is correct.** Route page redirect (Step 4) catches direct URL access. SectionSelector disabled button (Step 3) prevents UI-level clicks. Header guard (Step 5) and search page guard (Step 6) provide callback-level safety. Layered defense is the right pattern.

- **Translation key naming is clean.** `sections.soon` is a natural sibling to `sections.food`/`sections.ummah`/`sections.stores`.

- **Tests are well-defined.** The disabled tab, badge visibility, and no-op click tests cover the regression surfaces.

- **Search page resolveSection guard** (Step 6 second part) correctly prevents URL-based bypass on the search page.

## 5. Concerns

| Issue | Severity | Recommendation |
|---|---|---|
| **providers/page.tsx resolves section independently** (lines 40-45). Direct access to `/providers?section=ummah` bypasses the route-page redirect, reaches the server-side fetch and `ProvidersContent` with an inactive section. The plan doesn't add a `SECTION_META` check here. | Medium | Add guard: if resolved section is inactive, default to `'food'`. Same pattern as Step 4 — import `SECTION_META` and check `active` before proceeding with the server-side fetch. |
| **Search page has its own resolveSection function** (lines 49-54) instead of delegating to `resolveSectionFromSearchParams` from `sectionFilters.ts`. The plan's Step 6 only adds `SECTION_META` check, but doesn't fix the duplication. The search page's resolver also can't handle category-inferred sections. | Low | Replace the inline `resolveSection` with a call to `resolveSectionFromSearchParams`, adding the `SECTION_META` active check inside the canonical resolver or after it. Keeps section logic in one place. |

## 6. Conditions for Approval

1. **Add SECTION_META guard in `src/app/(public)/providers/page.tsx`** — the server component at lines 40-45 must check `SECTION_META[section].active` and fall back to `'food'` if the resolved section is inactive. Without this, `/providers?section=ummah` bypasses the route page redirect and serves an inactive section.

2. **Address the search page `resolveSection` duplication** — the inline resolver at `search/page.tsx:49-54` should use `resolveSectionFromSearchParams` from `sectionFilters.ts` (with `SECTION_META` guarding) instead of maintaining its own logic. This prevents the two resolvers from diverging in the future.

## 7. Recommendations

- **Simplify `getSectionLabel` in SectionSelector.** Currently a hardcoded switch (lines 30-34). After Step 1, this can be reduced to `t(SECTION_META[section].labelKey)`. Fewer lines, fewer bugs.

- **Document the redirect-vs-placeholder decision.** The analysis recommended a `<ComingSoonPlaceholder>` component (option 2) but the plan chose server-side `redirect()` (option 1). Both are valid. The plan should note in Step 4 rationale that redirect was chosen over placeholder per PO decision (faster to implement, less UI surface, and route page code stays intact for reactivation).

- **Check `CommunityServicesGallery.tsx` navigation flow.** The component at line 40 hardcodes `getResultsPathForSection('ummah')` and `section: 'ummah'`. With redirect in place, clicking a community service card will navigate to `/ummah?section=ummah&category=...`, trigger a 307 to `/food`, and lose the category param. This is acceptable for a deactivated section, but consider adding a breadcrumb or note for when ummah is re-activated.

## 8. Conclusion

The plan is architecturally sound. The `SECTION_META` config-driven approach is the right abstraction — consistent with existing patterns, extensible, and single-source-of-truth. The layered defense (disabled buttons + guards + route redirect) correctly addresses the main attack surfaces.

Two conditions must be resolved before implementation is complete: guarding `providers/page.tsx` section resolution, and consolidating the search page's duplicate resolver. Both are contained changes. The remaining recommendations are non-blocking improvements.
