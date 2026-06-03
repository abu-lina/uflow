# Plan 136 — Bug Analysis: Unused import `ReviewStatusFilter`

## Root Cause
Stale import left after copy-paste or refactor. `ReviewStatusFilter` was added alongside `AdminStatusFilter` in the import statement but never consumed in test logic.

## Evidence
- **File**: `src/features/admin/components/__tests__/AdminStatusFilter.test.tsx`
- **Line 4**:
  ```typescript
  import { AdminStatusFilter, type ReviewStatusFilter } from '../AdminStatusFilter';
  ```
- **Grep result**: `ReviewStatusFilter` appears exactly once — on line 4 (the import). Zero references in test bodies, assertions, or type annotations.
- **Source export** (`AdminStatusFilter.tsx:8`): `ReviewStatusFilter` is a `type` alias (`'approved' | 'pending' | 'rejected' | 'needs_revision' | null`), used internally by the component. The test never needs to reference this type directly because all string literals are inlined in test assertions (e.g., `fireEvent.click(approvedTab)` and `mockOnStatusChange('approved')`).

## Fix
Remove `type ReviewStatusFilter` from the import. Final result:

```typescript
import { AdminStatusFilter } from '../AdminStatusFilter';
```

## Impact
- **Type**: Lint warning (unused import).
- **Runtime**: Zero. Type-only import is elided at compile time.
- **Severity**: Low. Blocking only if CI enforces `--max-warnings=0`.

## Verification
1. `npm run lint:check` — should pass with zero warnings.
2. `npm test` — all 7 existing tests pass (no logic change).
