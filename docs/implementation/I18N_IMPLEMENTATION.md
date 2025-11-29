# Internationalization (i18n) Implementation

This document explains how the internationalization system works in the Ummah Flow application.

## Overview

The application now supports both English and German languages with a complete i18n implementation using a custom language provider system.

## Features

- ✅ **Automatic Language Detection** - Detects user's browser/system language preferences
- ✅ Language switching between English and German
- ✅ Persistent language preference (stored in localStorage)
- ✅ Language switcher component in the header
- ✅ Translated user greeting: "As-Salamu-Aleikum" + "Support your Ummah" / "Unterstütze Deine Ummah"
- ✅ Translated landing page content
- ✅ Translated navigation elements
- ✅ Translated authentication elements
- ✅ Translated profile elements
- ✅ Dynamic HTML lang attribute updates
- ✅ Development debugging logs

## File Structure

```
src/
├── providers/
│   └── LanguageProvider.tsx          # Language context and provider
├── components/
│   ├── ui/
│   │   └── LanguageSwitcher.tsx       # Language switcher component
│   └── layout/
│       └── LanguageUpdater.tsx        # Updates HTML lang attribute
├── translations/
│   ├── index.ts                      # Translation exports and types
│   ├── en.ts                         # English translations
│   └── de.ts                         # German translations
```

## Usage

### Using Translations in Components

```tsx
import { useLanguage } from '@/providers/LanguageProvider';

function MyComponent() {
  const { t, language, setLanguage } = useLanguage();
  
  return (
    <div>
      <h1>{t('common.greeting')}</h1>
      <p>{t('common.supportYourUmmah')}</p>
    </div>
  );
}
```

### Adding New Translations

1. Add the translation key to both `src/translations/en.ts` and `src/translations/de.ts`:

```typescript
// src/translations/en.ts
export const en = {
  mySection: {
    newKey: "English text"
  }
  // ... other translations
} as const;

// src/translations/de.ts
export const de = {
  mySection: {
    newKey: "German text"
  }
  // ... other translations
} as const;
```

2. Use the translation in your component:

```tsx
const { t } = useLanguage();
return <div>{t('mySection.newKey')}</div>;
```

### Language Switcher Component

The `LanguageSwitcher` component can be used in two variants:

```tsx
// Dropdown variant (default)
<LanguageSwitcher />

// Toggle variant
<LanguageSwitcher variant="toggle" />
```

## Translation Keys

### Common
- `common.greeting` - "As-Salamu-Aleikum"
- `common.supportYourUmmah` - "Support your Ummah." / "Unterstütze Deine Ummah."

### Navigation
- `navigation.home` - "Home" / "Startseite"
- `navigation.profile` - "Profile" / "Profil"
- `navigation.about` - "About" / "Über uns"

### Authentication
- `auth.login` - "Login" / "Anmelden"
- `auth.logout` - "Logout" / "Abmelden"
- `auth.register` - "Register" / "Registrieren"

### Landing Page
- `landing.hero.title` - Main hero title with HTML spans
- `landing.hero.subtitle` - Hero subtitle
- `landing.hero.getStarted` - CTA button text
- `landing.bismillah.translation` - Bismillah translation

## Language Detection

The system automatically detects the user's preferred language using multiple strategies:

1. **Primary Detection**: Checks `navigator.language` (user's primary browser language)
2. **Fallback Detection**: Checks `navigator.languages` array (user's language preference list)
3. **Country-based Detection**: Uses country codes for English-speaking regions (US, GB, AU, CA, NZ, IE, ZA)
4. **Default Fallback**: Falls back to German for unsupported languages

### Detection Priority:
1. Saved user preference (localStorage)
2. Browser primary language (`navigator.language`)
3. Browser language list (`navigator.languages`)
4. Country-based detection
5. Default to German

### Examples:
- `en-US` → English
- `de-DE` → German  
- `fr-FR` → German (fallback)
- `en-GB` → English (country-based)
- `es-ES` → German (fallback)

## Browser Support

The i18n system works in all modern browsers and includes:
- Fallback handling for missing translations
- Error logging for debugging
- Graceful degradation if translation files fail to load
- Development mode logging for language detection

## Debugging

In development mode, the system logs language detection information to the console:

```javascript
🌍 Language Detection: {
  browserLanguage: "en-US",
  languages: ["en-US", "en", "de"],
  detected: "en",
  timestamp: "2024-01-15T10:30:00.000Z"
}
```

This helps developers understand how the language detection is working for different users.

## Future Enhancements

- Add more languages (Arabic, Turkish, etc.)
- Implement server-side language detection
- Add pluralization support
- Implement date/time formatting per locale
- Add RTL (right-to-left) language support
