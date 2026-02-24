---
ID: 17
Origin: 17
UUID: b7f2e4c1
Status: Planned
---

# Analysis: i18n Header Translation Bug

## Changelog

| Date | Author | Action |
|------|--------|--------|
| 2026-02-23 | Analyst | Created analysis document |
| 2026-02-23 | Analyst | Status set to Planned; handed off to Planner |

---

## Value Statement & Objective

**Business Impact**: Users selecting English (EN) see German UI text, creating a confusing and unprofessional experience that undermines trust in the platform.

**Objective**: Identify why "Überall", "Anmelden", and "Registrieren" appear when the language is set to English.

---

## Context

- **Reporter**: User
- **Scope**: Header navigation bar
- **Environment**: localhost:3001
- **Observed behavior**: Screenshot shows EN selected but German strings displayed
- **Expected behavior**: English translations ("Everywhere", "Login", "Register")

---

## Methodology

1. **Upstream Tracing**: Followed translation flow from UI to translation system
2. **Component Isolation**: Examined Header.tsx, SearchBar.tsx, and search-provider.tsx
3. **Pattern Matching**: Searched codebase for hardcoded German strings

---

## Findings

### Finding 1: Hardcoded German in Header Buttons (PROVEN - Level 1)

**Location**: [src/components/layout/Header.tsx](../../../src/components/layout/Header.tsx#L208-L214)

```tsx
<button onClick={() => setShowLoginModal(true)}>
    Anmelden  // ❌ Hardcoded German
</button>
<button onClick={() => setShowSignupModal(true)}>
    Registrieren  // ❌ Hardcoded German
</button>
```

**Expected**:
```tsx
<button onClick={() => setShowLoginModal(true)}>
    {t('navigation.login')}  // ✅ Use translation
</button>
<button onClick={() => setShowSignupModal(true)}>
    {t('navigation.register')}  // ✅ Use translation
</button>
```

**Evidence**: The `t` function is already imported and used elsewhere in the same component (line 41: `const { t } = useLanguage()`). Lines 187-188 correctly use `t('profile.accountSettings')` and `t('auth.logout')`. The inconsistency proves this is an oversight, not a deliberate choice.

---

### Finding 2: Hardcoded German Default in Search Provider (PROVEN - Level 1)

**Location**: [src/providers/search-provider.tsx](../../../src/providers/search-provider.tsx#L19)

```tsx
const [selectedLocation, setSelectedLocation] = useState('Überall');  // ❌ Hardcoded German
```

**Impact**: The location dropdown in the search bar always initializes with German "Überall" regardless of user's language setting.

**Complication**: The SearchProvider is a React context with no access to the LanguageProvider context (both are at the same level in the component tree). This requires a different fix approach than simple string replacement.

---

### Finding 3: Hardcoded German in Service Layer (OBSERVED - Level 2)

Multiple service files contain hardcoded German defaults:

| File | Line | Code |
|------|------|------|
| [categories.ts](../../../src/services/categories.ts#L81) | 81 | `selectedLocation !== 'Überall'` |
| [categories.ts](../../../src/services/categories.ts#L111) | 111 | `selectedLocation !== 'Überall'` |
| [communityServices.ts](../../../src/services/communityServices.ts#L95) | 95 | `location: string = 'Überall'` |
| [saved/page.tsx](../../../src/app/(public)/saved/page.tsx#L122) | 122 | `selectedLocation === 'Überall'` |

These use an `everywhereTranslations` array as a workaround, but this is fragile and doesn't scale.

---

### Finding 4: Translation System is Correct (PROVEN - Level 1)

The translation infrastructure works correctly:

- **[en.ts](../../../src/translations/en.ts)**: Contains `navigation.login: "Login"`, `navigation.register: "Register"`, `search.everywhere: "Everywhere"`
- **[de.ts](../../../src/translations/de.ts)**: Contains German equivalents
- **LanguageProvider**: Correctly detects/stores language preference
- **useLanguage hook**: Works correctly where used

---

## Root Cause Summary

| Issue | Root Cause | Confidence |
|-------|------------|------------|
| "Anmelden" / "Registrieren" | Hardcoded strings in Header.tsx lines 208, 214 | **PROVEN** |
| "Überall" in dropdown | Hardcoded default in search-provider.tsx line 19 | **PROVEN** |
| Service layer comparisons | Missing language-agnostic identifier pattern | **OBSERVED** |

**Primary Root Cause**: Developer oversight - hardcoded German strings bypassing the existing translation system.

---

## Gap Tracking Table

| # | Unknown | Blocker | Required Action | Status |
|---|---------|---------|-----------------|--------|
| 1 | None - root cause identified | N/A | N/A | Resolved |

---

## Analysis Recommendations

1. **Fix Header.tsx**: Replace hardcoded strings with `t('navigation.login')` and `t('navigation.register')` (simple 2-line fix)

2. **Fix search-provider.tsx**: Initialize `selectedLocation` with a language-agnostic sentinel value (e.g., empty string or `'__ALL__'`) and let consumers translate it for display

3. **Fix service layer comparisons**: Use a constant like `LOCATION_ALL = '__ALL__'` instead of checking for translated strings

4. **Add ESLint rule**: Consider adding `no-german-strings` custom rule or use existing i18n-linting tools to prevent future occurrences

---

## Open Questions

None - root cause is fully identified with high confidence.

---

## Handoff Notes for Planner

**Gate Status**: ✅ PASSED - Root cause identified at Level 1 confidence.

**Fix Complexity**: Low-Medium
- Header fix: ~5 minutes (2 string replacements)
- SearchProvider fix: ~15 minutes (need language-agnostic pattern)
- Service layer: ~30 minutes (requires consistent refactoring)

**Risk**: Low - changes are isolated and testable.
