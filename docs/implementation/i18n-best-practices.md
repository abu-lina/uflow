# i18n Best Practices Guide

## Overview

This project uses a **hybrid approach** for internationalization that combines the best of both worlds:
1. **Type-safe translation objects** in TypeScript
2. **Translation key constants** for better IDE support and refactoring

## Current Architecture

### Translation Files (`src/translations/`)
- **`en.ts`** - English translations
- **`de.ts`** - German translations
- **`index.ts`** - Exports and types

These files export type-safe objects with nested structures like:
```typescript
export const en = {
  common: {
    greeting: "As-Salamu-Aleikum",
    supportYourUmmah: "Support your Ummah.",
  }
} as const;
```

### Translation Key Constants (`src/constants/translation-keys.ts`)
Centralized constants for all translation keys:
```typescript
export const TRANSLATION_KEYS = {
  COMMON: {
    GREETING: 'common.greeting',
    SUPPORT_YOUR_UMMAH: 'common.supportYourUmmah',
  },
  ACTIONS: {
    SAVE: 'actions.save',
    SAVED: 'actions.saved',
  },
} as const;
```

## Why This Approach?

### ✅ Benefits of Current System

1. **Type Safety** - All translations are TypeScript objects with proper types
2. **Runtime Efficiency** - No runtime compilation needed
3. **Simple & Fast** - Direct object access
4. **Bundle Size** - Tree-shakeable, only includes used translations
5. **No External Dependencies** - Pure TypeScript solution

### ✅ Benefits of Adding Constants

1. **IDE Autocomplete** - Get full IntelliSense for `TRANSLATION_KEYS.COMMON.GREETING`
2. **Type Safety** - Prevents typos like `'common.gret'` (mistyped)
3. **Refactoring** - Can easily find all usages of a key
4. **Documentation** - Constants file serves as a key registry

### ⚠️ Alternative Approaches (Not Recommended)

#### JSON Files
❌ **Not Recommended** - Lost type safety, slower runtime parsing

#### react-i18next / next-i18next
❌ **Not Recommended** - Heavy dependency (16KB+), complex setup, SSR issues

#### Dynamic Imports
❌ **Not Recommended** - Code splitting can break translations, complex hydration

## Usage Patterns

### Pattern 1: Using Constants (Recommended)
```tsx
import { useLanguage } from '@/providers/LanguageProvider';
import { TRANSLATION_KEYS } from '@/constants/translation-keys';

function MyComponent() {
  const { t } = useLanguage();
  
  return (
    <button>{t(TRANSLATION_KEYS.ACTIONS.SAVE)}</button>
  );
}
```

**Benefits:**
- ✅ Autocomplete
- ✅ Type safety
- ✅ Refactoring support
- ✅ Self-documenting code

### Pattern 2: Direct String (Also Fine)
```tsx
import { useLanguage } from '@/providers/LanguageProvider';

function MyComponent() {
  const { t } = useLanguage();
  
  return (
    <button>{t('actions.save')}</button>
  );
}
```

**Benefits:**
- ✅ Shorter code
- ✅ Works everywhere
- ⚠️ No autocomplete
- ⚠️ Typos possible

### Pattern 3: Mixed (Best Practice)
Use **constants for frequently used keys**, **strings for one-off cases**:

```tsx
import { useLanguage } from '@/providers/LanguageProvider';
import { TRANSLATION_KEYS } from '@/constants/translation-keys';

function MyComponent() {
  const { t } = useLanguage();
  
  return (
    <>
      {/* Use constant for common actions */}
      <button>{t(TRANSLATION_KEYS.ACTIONS.SAVE)}</button>
      
      {/* Use string for dynamic/rare keys */}
      <span>{t(`category.${categoryId}`)}</span>
    </>
  );
}
```

## Migration Strategy

### Phase 1: Add Constants (Current)
- ✅ Created `src/constants/translation-keys.ts`
- ✅ All keys defined and type-safe
- Available for use throughout the project

### Phase 2: Gradual Migration (Optional)
1. Start using constants in new components
2. Migrate high-traffic components (buttons, navigation)
3. Keep existing code as-is (backward compatible)

### Phase 3: Full Adoption (Optional)
- Find all string literals like `t('action.save')`
- Replace with `t(TRANSLATION_KEYS.ACTIONS.SAVE)`
- Benefits: Better IDE support, easier refactoring

## Adding New Translations

### Step 1: Add to Translation Files
```typescript
// src/translations/en.ts
export const en = {
  common: {
    // ... existing translations
    newKey: "New English Text"
  }
} as const;
```

```typescript
// src/translations/de.ts
export const de = {
  common: {
    // ... existing translations
    newKey: "Neuer deutscher Text"
  }
} as const;
```

### Step 2: Add to Constants (Optional but Recommended)
```typescript
// src/constants/translation-keys.ts
export const TRANSLATION_KEYS = {
  COMMON: {
    // ... existing keys
    NEW_KEY: 'common.newKey',
  },
} as const;
```

### Step 3: Use in Components
```tsx
// Option A: Using constant (recommended)
t(TRANSLATION_KEYS.COMMON.NEW_KEY)

// Option B: Using string (also fine)
t('common.newKey')
```

## Best Practices

1. **Group related translations** - Use nested objects (`actions.save`, `actions.saved`)
2. **Keep constants in sync** - Update both translation files and constants
3. **Use meaningful keys** - `common.welcome` not `c.w`
4. **Cache translations** - Current `t()` function is efficient
5. **Type safety** - Translation objects use `as const` for immutability

## Performance

### Current Performance
- **Translation lookup**: O(depth) where depth is key nesting (usually 1-3)
- **Memory**: Only loaded translations in bundle
- **Bundle size**: Tree-shakeable, minimal overhead

### Comparison
| Approach | Bundle Size | Runtime Speed | Type Safety | IDE Support |
|----------|-------------|---------------|-------------|-------------|
| **Current** | ✅ Small | ✅ Fast | ✅ Yes | ✅ Yes (with constants) |
| react-i18next | ❌ +16KB | ⚠️ Medium | ⚠️ Yes | ✅ Yes |
| next-i18next | ❌ +20KB | ⚠️ Slow (SSR) | ⚠️ Yes | ✅ Yes |
| JSON files | ✅ Small | ❌ Slow | ❌ No | ❌ No |

## Conclusion

**Your current approach is excellent!** 

✅ Simple & Fast  
✅ Type-Safe  
✅ No Dependencies  
✅ Scales Well  
✅ Works with Constants  

The addition of `TRANSLATION_KEYS` constants provides the benefits of more complex systems without their drawbacks. No changes needed - just optional usage improvements.

