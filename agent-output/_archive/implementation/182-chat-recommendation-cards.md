# Plan 182: Styled Chat Recommendation Cards

## Changelog

- Created `src/features/chat/components/SuggestionCard.tsx` — reusable button component matching greeting card design
- Created `src/utils/chat-icons.tsx` — pure utility function for mapping option text to recommendation icons
- Modified `src/features/chat/components/ChatWidget.tsx` — replaced 3 hardcoded `<button>` blocks with `SuggestionCard` instances
- Modified `src/features/chat/components/ChatMessage.tsx` — conditional rendering: `SuggestionCard` for `singleSelect`, `QuickReplies` for multi-select
- Created `src/__tests__/features/chat/SuggestionCard.test.tsx` — 5 tests (render, click, no subtitle, custom className, is button)
- Created `src/__tests__/utils/chat-icons.test.ts` — 4 tests (food, city, registration, default icons)

## Files Created

| File | Purpose |
|------|---------|
| `src/features/chat/components/SuggestionCard.tsx` | Reusable suggestion card button |
| `src/utils/chat-icons.tsx` | `getRecommendationIcon()` pure function |
| `src/__tests__/features/chat/SuggestionCard.test.tsx` | SuggestionCard unit tests |
| `src/__tests__/utils/chat-icons.test.ts` | chat-icons unit tests |

## Files Modified

| File | Change |
|------|--------|
| `src/features/chat/components/ChatWidget.tsx` | Import + use SuggestionCard for 3 greeting cards |
| `src/features/chat/components/ChatMessage.tsx` | Import SuggestionCard + getRecommendationIcon; conditional rendering for singleSelect |

## TDD Compliance

| Step | Status | Evidence |
|------|--------|----------|
| RED (tests fail before implementation) | ✅ | Both test files failed with "Failed to resolve import" |
| GREEN (tests pass after implementation) | ✅ | All 1751 tests pass (4 + 5 new tests) |
| Type-check | ✅ | `tsc --noEmit` passes cleanly |
| Lint (new files) | ✅ | No lint errors in new files. Pre-existing errors in ChatWidget.tsx (1) and ChatMessage.tsx (0) unchanged |
| Regression (existing tests) | ✅ | ChatWidget (6), ChatMessage (7) tests all pass |

## Test Evidence

### Unit Tests
```
 ✓ src/__tests__/utils/chat-icons.test.ts (4 tests) 18ms
 ✓ src/__tests__/features/chat/SuggestionCard.test.tsx (5 tests) 199ms
 ✓ src/__tests__/features/chat/ChatMessage.test.tsx (7 tests) 121ms
 ✓ src/__tests__/features/chat/ChatWidget.test.tsx (6 tests) 247ms
```

### Full Suite
```
Tests  1751 passed | 22 skipped (1773)
```

### Type-Check
```
npm run type-check  # passes with no output
```

### Lint (new files only)
```
npx eslint src/features/chat/components/SuggestionCard.tsx src/utils/chat-icons.tsx
# no output — clean
```

## Issues Encountered

1. **JSX in .ts file**: `chat-icons.ts` uses JSX (lucide-react elements) but was specified as `.ts`. Renamed to `.tsx` to satisfy the compiler.
2. **@testing-library/user-event not installed**: Switched to `fireEvent` from `@testing-library/react` for click simulation, matching the existing pattern in `ChatWidget.test.tsx`.
3. **Lint auto-fix prop reordering**: `--fix` reordered props on JSX elements in ChatMessage.tsx and ChatWidget.tsx (className before size, callbacks last). This is pre-existing code style enforcement — no functional changes.
