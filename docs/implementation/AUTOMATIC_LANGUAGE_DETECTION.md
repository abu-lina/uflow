# Language Selection Implementation

## Overview

This implementation provides a **hybrid language selection approach** that combines automatic detection with manual user control. The system automatically detects the user's browser language on first visit, but gives users full control through a prominent language switcher. Once a user manually selects a language, that choice is always respected and auto-detection is disabled for that user.

## Features

### ✅ Hybrid Language Selection Model
- **Manual Selection Primary**: Prominent language switcher in Header gives users full control
- **Auto-Detection as Initial Guess**: Automatically detects browser language on first visit for convenience
- **User Preference Priority**: Once manually selected, user's choice always takes precedence
- **Multi-language Support**: Supports English, German, Arabic, and Turkish
- **Persistent Storage**: Remembers user's language preference in localStorage and cookies
- **Server-Client Consistency**: Server-side detection matches client-side logic

### ✅ Comprehensive Translation Coverage
- **All UI Elements**: Headers, titles, buttons, and content are translated
- **Error Messages**: Error states and empty states are properly translated
- **Search Interface**: Search placeholders and labels are localized
- **Navigation**: All navigation elements support multiple languages

### ✅ Performance & Security
- **Client-side Detection**: Language detection happens on the client to avoid SSR issues
- **Hydration Safety**: Prevents hydration mismatches by starting with a default language
- **Type Safety**: Full TypeScript support with type-safe translation keys
- **Caching**: Translations are cached and only loaded once

## Implementation Details

### Language Detection Logic

**Detection Priority (Client & Server):**

1. **Saved User Preference** (localStorage + cookie) - **Highest Priority**
   - Represents explicit user choice
   - Always takes precedence over auto-detection
   - Persists across sessions

2. **Browser Language Detection** (only if no saved preference)
   - Checks `navigator.languages` array (user's language preference list)
   - Falls back to `navigator.language` if array is empty
   - Only used on first visit or if preference was cleared

3. **Default Fallback** - German (de)
   - Used if detection fails or no supported language found

```typescript
// Enhanced language detection with comprehensive mapping
const LANGUAGE_MAPPING: Record<string, Language> = {
  'en': 'en', 'de': 'de', 'ar': 'ar', 'tr': 'tr',
  'en-us': 'en', 'en-gb': 'en', 'en-ca': 'en', 'en-au': 'en',
  'de-de': 'de', 'de-at': 'de', 'de-ch': 'de',
  'ar-sa': 'ar', 'ar-ae': 'ar', 'ar-eg': 'ar', 'ar-ma': 'ar',
  'tr-tr': 'tr',
};

function detectLanguage(): Language {
  // Priority 1: Check saved user preference (explicit user choice)
  const savedLanguage = localStorage.getItem('preferred-language');
  if (isValidLanguage(savedLanguage)) {
    return savedLanguage; // User has selected - always use this
  }

  // Priority 2: Auto-detect from browser languages (only if no saved preference)
  const browserLanguages = navigator.languages || [];
  const allLanguages = browserLanguages.length > 0 
    ? browserLanguages 
    : navigator.language ? [navigator.language] : [];
  
  for (const lang of allLanguages) {
    const normalized = normalizeLanguageCode(lang);
    if (normalized in LANGUAGE_MAPPING) {
      return LANGUAGE_MAPPING[normalized];
    }
  }

  // Priority 3: Default fallback
  return 'de';
}
```

### Key Principles

- **User Control**: Manual selection always overrides auto-detection
- **Convenience**: Auto-detection helps first-time users
- **Consistency**: Once selected, preference is always respected
- **Reliability**: Improved detection logic reduces wrong guesses

### Translation System

#### Translation Files Structure
```
src/translations/
├── index.ts          # Main export and type definitions
├── en.ts            # English translations
├── de.ts            # German translations
├── ar.ts            # Arabic translations
└── tr.ts            # Turkish translations
```

#### Type-Safe Translation Keys
```typescript
export const TRANSLATION_KEYS = {
  COMMON: {
    GREETING: 'common.greeting',
    LOADING: 'common.loading',
    // ... more keys
  },
  PROVIDERS: {
    ERROR_LOADING: 'providers.errorLoading',
    NO_RESULTS_FOUND: 'providers.noResultsFound',
    // ... more keys
  },
} as const;
```

### Language Provider Implementation

```typescript
export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>('de'); // SSR-safe default

  // Save language preference (explicit user choice)
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    // Save to localStorage (marks as user-selected)
    localStorage.setItem('preferred-language', lang);
    // Save to cookie (for server-side consistency)
    setCookie('preferred-language', lang, { maxAge: 365 });
  };

  useEffect(() => {
    // Priority 1: Check saved user preference
    const savedLanguage = localStorage.getItem('preferred-language');
    if (isValidLanguage(savedLanguage)) {
      setLanguageState(savedLanguage);
      syncCookie(savedLanguage);
      return; // User has selected - don't auto-detect
    }

    // Priority 2: Auto-detect (only if no saved preference)
    const detectedLang = detectLanguage();
    setLanguageState(detectedLang);
    // Save auto-detected language as initial preference
    localStorage.setItem('preferred-language', detectedLang);
    syncCookie(detectedLang);
  }, []);

  // Translation function with fallback
  const t = (key: string): string => {
    // ... translation logic
  };
}
```

### Language Switcher Component

The `LanguageSwitcher` component is prominently displayed in the Header, giving users easy access to change their language preference:

- **Compact Variant**: Used in Header for space efficiency
- **Accessibility**: Full keyboard navigation, ARIA labels, screen reader support
- **Visual Feedback**: Loading states, smooth transitions
- **RTL Support**: Proper right-to-left layout for Arabic

## Supported Languages

### Current Languages
1. **English (en)** - Default international language
2. **German (de)** - Primary language for German-speaking users
3. **Arabic (ar)** - For Arabic-speaking Muslim communities
4. **Turkish (tr)** - For Turkish-speaking Muslim communities

### Language Variants Supported
- **English**: en-US, en-GB, en-CA, en-AU
- **German**: de-DE, de-AT, de-CH
- **Arabic**: ar-SA, ar-AE, ar-EG, ar-MA
- **Turkish**: tr-TR

## Usage Examples

### Basic Translation Usage
```typescript
import { useLanguage } from '@/providers/LanguageProvider';

function MyComponent() {
  const { t } = useLanguage();
  
  return (
    <div>
      <h1>{t('common.greeting')}</h1>
      <p>{t('providers.errorLoading')}</p>
    </div>
  );
}
```

### Language Switching

The `LanguageSwitcher` component is available in the Header and can be used anywhere:

```typescript
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/providers/LanguageProvider';

// In Header (compact variant)
<LanguageSwitcher variant="compact" />

// In other components (dropdown variant)
<LanguageSwitcher variant="dropdown" />

// Programmatic language change
function MyComponent() {
  const { language, setLanguage } = useLanguage();
  
  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang); // This saves preference and disables auto-detection
  };
}
```

## Testing

### Manual Testing
1. **First Visit Test**: Clear localStorage and cookies, visit site - should auto-detect browser language
2. **Manual Selection Test**: Use language switcher in Header to change language
3. **Persistence Test**: Refresh page - manually selected language should persist
4. **Override Test**: After manual selection, change browser language - app should still use manual selection
5. **Server-Client Sync Test**: Check that HTML `lang` attribute matches selected language
6. **Accessibility Test**: Test keyboard navigation (Tab, Enter, Arrow keys, Escape)
7. **RTL Test**: Switch to Arabic - verify right-to-left layout works correctly

### Automated Testing
Run the language detection test script:
```typescript
// In browser console
testLanguageDetection();
```

## Performance Considerations

### Optimizations Implemented
- **Lazy Loading**: Translations are loaded only when needed
- **Caching**: Language preference is cached in localStorage
- **SSR Safety**: Prevents hydration mismatches with proper defaults
- **Type Safety**: Compile-time checking prevents translation key errors

### Bundle Size Impact
- **Minimal Impact**: Only loaded translations are included in bundle
- **Tree Shaking**: Unused translations are eliminated in production builds
- **Code Splitting**: Language-specific code can be split if needed

## Security & Compliance

### Security Measures
- **Client-side Only**: No sensitive language data sent to server
- **XSS Prevention**: All translations are properly escaped
- **Input Validation**: Language codes are validated before use

### Compliance Features
- **GDPR Compliant**: Language preference is stored locally only
- **Accessibility**: Proper ARIA labels and language attributes
- **SEO Friendly**: HTML lang attribute is updated dynamically

## Future Enhancements

### Planned Features
1. **More Languages**: French, Urdu, Indonesian, Malay
2. **RTL Support**: Full right-to-left support for Arabic
3. **Pluralization**: Advanced pluralization rules
4. **Date/Number Formatting**: Locale-specific formatting
5. **Dynamic Loading**: Load translations on-demand

### Extensibility
The system is designed to be easily extensible:
- Add new languages by creating new translation files
- Extend language mapping for more variants
- Add custom translation functions for complex scenarios

## Troubleshooting

### Common Issues

1. **Wrong language detected on first visit**
   - Check browser language settings (`navigator.languages`)
   - Verify language is in supported list (en, de, ar, tr)
   - Use language switcher in Header to manually select correct language

2. **Language changes unexpectedly**
   - Check if localStorage/cookies are being cleared
   - Verify no conflicting code is calling `setLanguage` automatically
   - Once manually selected, language should not change unless user changes it

3. **Language switcher not visible**
   - Check Header component - switcher should be visible on desktop and mobile
   - Verify `LanguageSwitcher` is imported and rendered in Header

4. **Server and client language mismatch**
   - Check that cookie is being set correctly (check browser DevTools)
   - Verify `detectLanguageFromServer` prioritizes cookie over Accept-Language header
   - Ensure HTML `lang` attribute matches selected language

5. **Translations missing**
   - Verify translation keys exist in all language files
   - Check console for warnings about missing keys

6. **Hydration errors**
   - Ensure SSR and client-side defaults match (both start with 'de')
   - Language detection only happens after hydration (client-side)

7. **Performance issues**
   - Check for unnecessary re-renders when language changes
   - Verify translations are cached and not re-computed unnecessarily

### Debug Tools
- Browser console warnings for missing translations
- Language detection test script: `testLanguageDetection()` in browser console
- React DevTools for provider state inspection
- Browser DevTools: Check localStorage `preferred-language` and cookie `preferred-language`
- Network tab: Verify Accept-Language header in requests

### Best Practices

1. **Always prioritize user preference**: Once user selects a language, respect that choice
2. **Provide easy access**: Language switcher should be prominently visible
3. **Maintain consistency**: Server and client should use same detection logic
4. **Handle edge cases**: Invalid language codes, missing translations, etc.
5. **Test accessibility**: Keyboard navigation, screen readers, RTL layouts
