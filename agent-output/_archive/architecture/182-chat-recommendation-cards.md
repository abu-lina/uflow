---
ID: 182
Origin: 182
UUID: a7f93e2c
Status: Active
---

# Architecture Review: Chat Recommendation Cards

## Verdict

APPROVED_WITH_CHANGES

## Summary

The plan is architecturally sound but has two concrete issues and one missed optimization opportunity:

1. **Critical DRY concern**: `SuggestionCard` is a near-duplicate of the existing `RowItem` (`src/components/ui/RowItem.tsx`). Both render icon + title + subtitle in a button. `SuggestionCard` has a different icon container style (`w-12 h-12 rounded-[10px] bg-primary/10`) and uses `gap-4` vs `gap-3`, but the overall pattern is the same. This needs explicit justification or reuse.
2. **`getOptionIcon` is un-extractable**: The heuristic function is defined inside `ChatMessage.tsx` as a module-level function. Tests can't import it directly. It needs extraction to a utility file.
3. **Placement is correct** per the PLACEMENT_RUBRIC — chat-specific visual components belong in `src/features/chat/components/`.

## Findings

### Finding 1: SuggestionCard duplicates RowItem (HIGH)

`RowItem` at `src/components/ui/RowItem.tsx:52` accepts the exact same prop shape (`icon`, `title`, `subtitle`, `onClick` via `onSelect`, `className`) and renders identical typography (`font-inter-tight text-base font-semibold` for title, `font-inter text-sm text-text-muted` for subtitle via `RowItemContent`). The only difference is the icon container wrapper:

| Aspect | RowItem | SuggestionCard |
|--------|---------|---------------|
| Icon container | Generic `shrink-0` (via `IconListRow`) | `w-12 h-12 rounded-[10px] bg-primary/10` |
| Gap | `gap-3` | `gap-4` |
| Title truncation | `truncate` on title/subtitle | No truncation |
| Selection state | Built-in (`IconWrapper` with ring+check) | None |

The styling difference is modest — a className on the icon prop or a minor RowItem enhancement could close it. Creating a parallel component adds maintenance surface.

**Recommendation**: Either (a) reuse `RowItem` directly with a styled icon wrapper at call sites, or (b) keep `SuggestionCard` but add a comment referencing the overlap and promote it to `src/components/ui/` if reused outside chat later.

### Finding 2: getOptionIcon is not directly testable (MEDIUM)

The plan defines `getOptionIcon` at module level inside `ChatMessage.tsx` (plan line 87-99) and says it should be tested "implicitly through ChatMessage tests." This is a testing anti-pattern — the function has 4 branches and clear input/output mapping, yet there's no way to import it for isolated unit tests.

**Recommendation**: Extract to `src/utils/chat-icons.ts` as a pure exported function. Add explicit unit tests in `src/__tests__/utils/chat-icons.test.ts`.

### Finding 3: SuggestionCard placement is correct (INFO)

`SuggestionCard` renders a chat-specific visual (greeting card style with `w-12 h-12 rounded-[10px] bg-primary/10` icon container). Per the PLACEMENT_RUBRIC, domain-specific UI goes in `src/features/<domain>/components/`. Since this pattern currently only serves the chat feature, `src/features/chat/components/` is correct. The plan's note about potential future reuse outside chat is premature — promote it when that happens.

### Finding 4: Icon heuristic is acceptable but has a gap (LOW)

`getOptionIcon` is deterministic (same input → same output) and pure (no side effects), so it satisfies the engineering standards for a utility function. The fallback to `Sparkles` for unknown text is a safe default. However, the regex list is:
- German-specific (not i18n-aware for English/Turkish/Arabic users)
- A maintenance burden as cuisine/city keywords grow
- Prone to false positives (e.g., "Berlin" matching as a food keyword? No — the regexes are separate groups)
- Cannot distinguish "Berlin" the city from "Berlin" a brand/neighborhood

These are cosmetic risks with low impact. The plan correctly labels this as Risk #1 with "Low" severity.

### Finding 5: QuickReplies boundary is correct (INFO)

The condition `singleSelect ? SuggestionCard : QuickReplies` (plan line 123-134) cleanly separates the two interaction patterns. QuickReplies supports multi-select checkbox behavior; SuggestionCard is for single-select suggestions. No regression risk for existing flows.

### Finding 6: Data flow is unchanged (INFO)

No modifications to `ChatMessage` type, API route handler, `useChat` hook, or data fetching. The change is purely presentational — options that already exist in the message object are rendered differently. This is the ideal scope for a visual change.

### Finding 7: Missing `'use client'` justification for SuggestionCard (INFO)

The plan includes `'use client'` on SuggestionCard, which is correct (it handles `onClick`). No issue here, just noting it's properly marked.

## Recommendations

1. **Resolve the RowItem overlap** — either reuse RowItem with styled icon wrappers, or keep SuggestionCard with a documented rationale. If keeping it, scope it to chat and don't promise cross-domain reuse yet.
2. **Extract `getOptionIcon`** to `src/utils/chat-icons.ts` — test it in isolation, not implicitly through ChatMessage.
3. **Add explicit unit tests for `getOptionIcon`** in `src/__tests__/utils/chat-icons.test.ts` — test all four branches (food, city, registration, default).
4. **Mark the heuristic as intentionally incomplete** — add a comment that the keyword list covers the most common LLM output patterns for the current use case, and will be extended as needed.

## Compliance Assessment

| Principle | Status | Notes |
|-----------|--------|-------|
| SRP | ✅ | SuggestionCard handles one concern (rendering a clickable card with icon + text). `getOptionIcon` has a single responsibility (map string → icon). |
| DRY | ⚠️ | SuggestionCard duplicates RowItem's icon + title + subtitle pattern. The styling differences are minimal. Either reuse RowItem or accept the duplication with documented intent. |
| YAGNI | ✅ | No unused code. The plan doesn't add hooks, API routes, or types that aren't needed. The future-reuse remark is minor. |
| KISS | ✅ | The approach is straightforward: extract a card component, replace hardcoded markup. No new state management, no backend changes. |
| Testability | ⚠️ | `getOptionIcon` is untestable in isolation as a private module function inside ChatMessage.tsx. Extract to a utility file to fix. |
| Separation of Concerns | ✅ | Presentational change only. No business logic, data fetching, or state management mixed in. |
| Open/Closed | ✅ | ChatMessage's rendering path is extended without modifying its core markdown/content rendering. QuickReplies remain open for extension. |
