---
ID: 111
Origin: 111
UUID: d7e4a1b3
Status: Planned
---

# 111 — i18n Coverage Analysis

## Changelog

| Date       | Author  | Summary |
|------------|---------|---------|
| 2026-04-28 | Analyst | Initial comprehensive audit of hardcoded strings and missing translation keys |
| 2026-04-28 | Planner | Status → Planned; Plan 111 created; moved to closed/ |

## Value Statement & Business Objective

UmmahFlow serves a multilingual Muslim community (de, en, ar, tr, ur, ps). Hardcoded strings and missing translation keys degrade the experience for non-German users and undermine trust. This analysis catalogs every i18n gap so Planner can scope a complete remediation.

## Context

- **i18n system**: Custom `LanguageProvider` in `src/providers/LanguageProvider.tsx` with a `t(key)` function using dot-notation into TypeScript translation objects.
- **Locale files**: `src/translations/{en,de,ar,tr,ur,ps}.ts` — TypeScript exports, NOT JSON.
- **Supported languages**: en, de, ar, tr, ur, ps (6 locales).
- **Canonical locale**: `en.ts` (725 keys) — all other locales should match.
- **Prior open items**: Plan 061 row 27 (admin edit page hardcoded English), Plan 107 DF-2 (non-German translation quality).
- **Legacy hook**: `src/hooks/useLanguage.ts` — only supports en/de; 3 files still import it.

## Methodology

1. **Key-diff analysis**: Extracted all keys from each locale file, compared against `en.ts` as canonical reference.
2. **Codebase grep**: Searched all `src/app`, `src/features`, `src/components` for hardcoded `aria-label`, `placeholder`, `title`, visible text in JSX, `toast.error`/`toast.success` calls, and `language ===` ternary patterns.
3. **t() usage audit**: Cross-referenced all `t('key')` calls in code against available keys in `en.ts`.

---

## Findings

### F1 — Missing Translation Keys Across Locales [L1 Proven]

EN and DE are complete (725 keys each). Other locales have gaps:

| Locale | Total Keys | Missing vs EN | Gap % |
|--------|-----------|---------------|-------|
| **de** | 725 | 0 | 0% |
| **ar** | 696 | **29** | 4.0% |
| **tr** | 696 | **29** | 4.0% |
| **ur** | 715 | **10** | 1.4% |
| **ps** | 711 | **14** | 1.9% |

**Missing keys by namespace:**

| Namespace | Keys Missing | Affected Locales |
|-----------|-------------|------------------|
| `suchen.wer.*` (7 keys) | `forMe`, `maennerLabel`, `frauenLabel`, `kinderLabel`, `subtitle`, `decrementAriaLabel`, `incrementAriaLabel` | ar, tr, ur, ps |
| `providers.*` (5 keys) | `saveProvider`, `removeSaved`, `shareProvider`, `call`, `website` | ar, tr |
| `create.recommend.*` (6 keys) | `contactTitle`, `contactDescription`, `userEmailTitle`, `userEmailDescription`, `userEmailLabel`, `userEmailPlaceholder` | ar, tr |
| `create.offers.*` (6 keys) | `rateLimitExceeded`, `collapseSelected`, `expandSelected`, `collapseRecommended`, `expandRecommended`, `collapseMoreOffers`, `expandMoreOffers` | ar, tr |
| `create.recommend.success*` (4 keys) | `successTitle`, `successDescription`, `recommendAnother`, `backToOverview` | ps |
| `waitlist.cityEarlyAccess.*` (2 keys) | `changeCity`, `cityChanged` | ar, tr |
| `common.support` | 1 key | ar, tr |
| `profile.yourContent` | 1 key | ar, tr |
| `legal.*` (3 keys) | `impressum`, `legalInfo`, `legalLinksTitle` | ur, ps |

**Impact**: When a key is missing, `t()` returns the raw key string (e.g., `suchen.wer.forMe` appears literally on screen). The `WerAudienceFilter` component used on `/search` is visibly broken for ar/tr/ur/ps users.

---

### F2 — Legacy `language === 'de'` Ternary Pattern [L1 Proven]

Two pages use inline `language === 'de' ? 'German' : 'English'` ternaries instead of `t()`, limiting them to only 2 of 6 supported languages:

| File | Hardcoded String Count | Import |
|------|----------------------|--------|
| `src/app/(public)/forgot-password/ForgotPasswordPageContent.tsx` | ~30 ternaries | `@/hooks/useLanguage` (legacy) |
| `src/app/(public)/reset-password/ResetPasswordPageContent.tsx` | ~20 ternaries | `@/hooks/useLanguage` (legacy) |

These files also import the **legacy** `useLanguage` hook from `@/hooks/useLanguage` (only en/de), not the 6-language `LanguageProvider`.

**Impact**: Arabic, Turkish, Urdu, and Pashto users see English text on forgot-password and reset-password pages.

---

### F3 — Entirely Untranslated Pages [L1 Proven]

| Page | Issue |
|------|-------|
| `src/app/(public)/create-quick/page.tsx` | All labels English-only (e.g., `title="Quick Create"`) |
| `src/app/(public)/create-quick/review/page.tsx` | ~25+ hardcoded English labels, placeholders, toast messages. No `useLanguage` import at all. |

**Impact**: These pages display entirely in English regardless of user language.

---

### F4 — Hardcoded `aria-label` Strings [L1 Proven]

~50+ hardcoded `aria-label` values found across components. Grouped by severity:

**German-only aria-labels (broken for all non-German users):**

| Component | Line | Value |
|-----------|------|-------|
| `src/app/(public)/search/page.tsx` | 567 | `"Angebote suchen"` |
| `src/components/layout/PageHeader.tsx` | 224 | `"Zurück"` |
| `src/components/layout/MobileHeader.tsx` | 50 | `"Zurück"` |
| `src/components/layout/ScrollablePageHeader.tsx` | 84 | `"Zurück"` |
| `src/components/layout/Header.tsx` | 124 | `"Zur Startseite"` |
| `src/components/layout/Header.tsx` | 167 | `"Profil Dropdown öffnen"` |
| `src/components/providers/ProviderCardModal.tsx` | 557 | `"Vorheriges Bild"` |
| `src/components/providers/ProviderCardModal.tsx` | 570 | `"Nächstes Bild"` |
| `src/components/providers/ProviderCardModal.tsx` | 597 | `"Schließen"` |
| `src/components/providers/ProviderDetailModal.tsx` | 456 | `"Vorheriges Bild"` |
| `src/components/providers/ProviderDetailModal.tsx` | 469 | `"Nächstes Bild"` |
| `src/components/providers/ProviderDetailModal.tsx` | 525 | `"Schließen"` |
| `src/components/providers/ProviderDetailModal.tsx` | 380 | `title="Adresse antippen zum Navigieren"` |
| `src/components/providers/ProviderDetailPage.tsx` | 350 | `title="Adresse antippen zum Navigieren"` |
| `src/components/providers/ProviderDetailPage.tsx` | 615 | `"Provider teilen"` |
| `src/components/providers/ProviderCreationForm.tsx` | 43 | `"Titel des Providers oder Services"` |
| `src/components/providers/TagsMultiSelect.tsx` | 90 | `"Tags auswählen"` |
| `src/components/ui/PWAInstallPrompt.tsx` | 133 | `"Schließen"` |
| `src/components/ui/PWAInstallPrompt.tsx` | 165 | `"Teilen Symbol"` |
| `src/components/ui/PWAInstallPrompt.tsx` | 195 | `"Plus Symbol"` |
| `src/components/ui/PageSliderIndicator.tsx` | 17 | `"Seitenanzeige"` |
| `src/components/shared/ExploreSection.tsx` | 108 | `"Entdecke Angebote"` |
| `src/components/shared/ExploreSection.tsx` | 125 | `"Zu den Providers"` |
| `src/components/shared/UserNavigationTabs.tsx` | 45 | `"Gespeicherte Provider anzeigen"` |
| `src/components/shared/UserNavigationTabs.tsx` | 66 | `"Erstellte Provider anzeigen"` |
| `src/components/shared/UserNavigationTabs.tsx` | 87 | `"Empfehlungen anzeigen"` |
| `src/components/shared/UserNavigationTabs.tsx` | 108 | `"Profil bearbeiten"` |
| `src/components/common/ProfileActionBar.tsx` | 44 | `"Gespeicherte Provider anzeigen"` |
| `src/components/common/ProfileActionBar.tsx` | 63 | `"Erstellte Provider anzeigen"` |
| `src/components/common/ProfileActionBar.tsx` | 81 | `"Neuen Provider erstellen"` |
| `src/components/common/ProfileActionBar.tsx` | 90 | `"Profil bearbeiten"` |
| `src/components/community-services/CommunityServiceDetailModal.tsx` | 389 | `"Vorheriges Bild"` |
| `src/components/community-services/CommunityServiceDetailModal.tsx` | 402 | `"Nächstes Bild"` |
| `src/components/community-services/CommunityServiceDetailModal.tsx` | 448 | `"Schließen"` |
| `src/components/common/MobileProfileScreen.tsx` | 86 | `"Schließen"` |

**English-only aria-labels:**

| Component | Line | Value |
|-----------|------|-------|
| `src/features/admin/components/AdminStatusFilter.tsx` | 45 | `"Filter providers by review status"` |
| `src/features/search/components/SectionSelector.tsx` | 38 | `"Browse sections"` |
| `src/components/providers/ProviderCardModal.tsx` | 476 | `"Provider details"` |
| `src/components/providers/ProviderDetailModal.tsx` | 346 | `"Provider details"` |
| `src/components/providers/ProviderCard.tsx` | 442 | `"Barakah"` |
| `src/components/providers/ProviderCard.tsx` | 482 | `"Approve"` |
| `src/components/providers/ProviderCard.tsx` | 499 | `"Reject"` |
| `src/components/providers/ProviderCard.tsx` | 707 | `"Website"` |
| `src/components/ui/LoadingSpinner.tsx` | 22 | `"Loading"` |
| `src/components/ui/PushNotificationPrompt.tsx` | 263 | `"Dismiss"` |
| `src/components/shared/CityEarlyAccessNavbar.tsx` | 90,104,119,134 | `"Home"`, `"Create"`, `"Saved"`, `"Profile"` |
| `src/components/shared/MobileGreetingHeader.tsx` | 111 | `"Change city"` |

Also many `aria-label="Zurück"` in `(public)/create/` sub-pages:
- `create/basics/offers/page.tsx:511`
- `create/basics/category/page.tsx:96`
- `create/basics/needs/page.tsx:410`
- `create/media/images/page.tsx:77`
- `create/media/social/page.tsx:102`
- `privacy-policy/PrivacyPolicyContent.tsx:263`
- `terms/TermsOfServiceContent.tsx:223`
- `impressum/ImpressumContent.tsx:111`
- `providers/ProfileProviderDetailPage.tsx:83`

---

### F5 — Hardcoded `placeholder` Strings [L1 Proven]

| Component | Placeholders (count) | Language |
|-----------|---------------------|----------|
| `src/app/(public)/signup/SignupPageContent.tsx` | 3 | German |
| `src/features/auth/components/SignupModal.tsx` | 3 | German |
| `src/features/providers/ProviderCreateForm.tsx` | 8 | German |
| `src/app/(public)/create-quick/review/page.tsx` | 10 | English |
| `src/app/(dashboard)/dashboard/community-services/[id]/edit/page.tsx` | 8 | German |
| `src/features/admin/components/RejectModal.tsx` | 1 | English |
| `src/features/search/components/SearchBar.tsx` | 1 | English |
| `src/components/providers/ProviderCreationForm.tsx` | 2 | German |

---

### F6 — Hardcoded Toast Messages [L1 Proven]

~35+ toast messages use hardcoded strings instead of `t()`:

**Public pages:**
- `src/app/(public)/providers/ProvidersContent.tsx:274,303` — English admin toast errors
- `src/app/(public)/saved/page.tsx` — Mixed German toast messages (~6)
- `src/app/(public)/create-quick/review/page.tsx` — English toast messages (~4)
- `src/app/(public)/login/LoginPageContent.tsx:95` — German toast error
- `src/app/city-selection/page.tsx:271,276` — English toast errors

**Dashboard pages:**
- `src/app/(dashboard)/dashboard/providers/[id]/edit/` — English toasts (~6 per sub-page)
- `src/app/(dashboard)/dashboard/community-services/[id]/edit/` — English toasts (~8 per sub-page)

---

### F7 — Hardcoded Visible Text in JSX [L1 Proven]

| Component | Line | Text |
|-----------|------|------|
| `src/app/(public)/providers/ProvidersContent.tsx` | 518 | `"Admin Filter:"` |
| `src/app/(public)/create-quick/page.tsx` | 98 | `title="Quick Create"` |
| `src/app/(public)/create-quick/review/page.tsx` | 142 | `title="Review & Publish"` |
| `src/app/(public)/create-quick/review/page.tsx` | 131+ | `"Please use mobile view..."`, `"Review your details"`, `"Imported from..."`, `"Business Name *"`, `"Description"`, `"Location"`, `"Street"`, `"City *"`, `"ZIP"`, `"Country"`, `"Contact"`, `"Phone"`, `"Email"`, `"Website"`, `"Instagram"` |
| `src/app/(public)/signup/check-email/page.tsx` | 37 | `title="Überprüfe dein E‑Mail Postfach"` |
| `src/app/(public)/signup/SignupPageContent.tsx` | 197 | `title="Registrieren"` |
| `src/app/(public)/signup/SignupPageContent.tsx` | 207 | `title="Willkommen bei Ummah Flow"` |
| `src/app/(public)/create/social-category/page.tsx` | 82 | `title="Kategorie auswählen"` |

---

### F8 — Keys Referenced in Code but Missing from EN Translation [L2 Observed]

The following `t()` keys are used in production code but have no matching entry in `en.ts` (or any locale). The `t()` function returns the raw key string as fallback:

| Key | Used In | Has In-Code Fallback? |
|-----|---------|----------------------|
| `search.context.allResults` | `SearchContextBar.tsx` | Yes (`?? sectionLabel`) |
| `search.context.edit` | `SearchContextBar.tsx` | Yes (`?? 'Edit search'`) |
| `login.loading` | `saved/page.tsx` | Yes (`\|\| 'Anmeldung...'`) |
| `login.submit` | `saved/page.tsx` | Yes (`\|\| 'Anmelden'`) |
| `saved.errorLoading` | `saved/page.tsx` | Yes (`\|\| 'Error loading...'`) |
| `saved.errorLoadingDescription` | `saved/page.tsx` | Yes (`\|\| 'Failed to load...'`) |
| `create.basics.descriptionLabel` | create basics page | Unknown |
| `create.basics.descriptionPlaceholder` | create basics page | Unknown |
| `create.location.validationError` | create location page | Unknown |
| `create.needs.errorLoading` | create needs page | Unknown |
| `create.needs.mustBeLoggedIn` | create needs page | Unknown |
| `create.offers.loadMore` | create offers page | Unknown |
| `create.offers.mustBeLoggedIn` | create offers page | Unknown |
| `waitlist.errorServerError` | waitlist page | Unknown |
| `waitlist.retry` | waitlist page | Unknown |

---

### F9 — Confirmed Task Examples Assessment [L1 Proven]

1. **"Suche starten" on homepage**: This IS a correct German translation (`home.searchPlaceholder` = "Suche starten" in `de.ts`, "Start searching" in `en.ts`). The key exists in all 6 locales. The HomeSearchBar component correctly uses `t('home.searchPlaceholder')`. **Not a bug** — the reporter likely saw German text because the system defaults to German (SSR hydration starts with `'de'`).

2. **`/providers?category=...&section=food` — untranslated labels**: The `SearchContextBar` shown on this page references `search.context.allResults` and `search.context.edit` which are **missing from all locale files** (F8). Fallbacks mask the issue for most users, but this is a gap. The `SectionSelector` correctly uses `t('sections.food')` etc.

3. **`/search?section=food` — untranslated labels**: The `WerAudienceFilter` used on this page references `suchen.wer.*` keys which are **missing from ar/tr/ur/ps** (F1). German and English users see correct labels; other locale users see raw key strings.

---

## Remaining Gaps

| # | Unknown | Blocker | Required Action | Owner |
|---|---------|---------|-----------------|-------|
| 1 | Are the `create.basics.descriptionLabel` etc. keys (F8 "Unknown" fallback) actually rendered as raw keys on screen? | Need to trace each callsite. | Grep each key's usage and check for inline fallbacks. | Planner |
| 2 | Are there hardcoded strings in `src/components/shared/AboutPageContent.tsx`? | Did not audit deeply — server-rendered content page. | Manual inspection. | Planner |
| 3 | Quality of existing non-DE/EN translations (Plan 107 DF-2). | Out of scope per task framing. | Deferred to EOQ 2026. | — |

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Missing locale keys (ar+tr+ur+ps combined) | **82** unique gaps |
| Pages with zero i18n coverage | **2** (create-quick, create-quick/review) |
| Pages using legacy 2-language ternary | **2** (forgot-password, reset-password) |
| Hardcoded aria-labels | **~50** |
| Hardcoded placeholders | **~36** |
| Hardcoded toast messages | **~35** |
| Hardcoded visible JSX text | **~25** |
| t() keys missing from all locales | **~15** |
| Files importing legacy useLanguage hook | **3** |

---

## Analysis Recommendations

1. **Add all 82 missing keys** to ar.ts, tr.ts, ur.ts, ps.ts — these cause visible raw-key display.
2. **Migrate forgot-password and reset-password** from `language ===` ternaries to `t()` calls, and switch from legacy `@/hooks/useLanguage` to `@/providers/LanguageProvider`.
3. **Add i18n to create-quick pages** — these are entirely hardcoded.
4. **Add ~15 missing keys to en.ts** (and all other locales) for keys referenced in code but not in any locale file (F8).
5. **Wrap ~50 aria-labels, ~36 placeholders, ~35 toasts, ~25 visible text strings** in `t()` calls, adding corresponding keys to all 6 locale files.
6. **Add a CI lint rule** (or ESLint plugin) to detect future hardcoded strings in JSX — prevents regression.
7. **Trace the F8 "Unknown fallback" keys** to confirm whether they cause visible issues.

---

## Open Questions

- Should `aria-label` i18n be prioritized equally with visible text, or deferred? (Accessibility vs user-facing urgency)
- Should admin-only strings (e.g., "Admin Filter:", admin toast messages) be translated, or are admin users expected to use English?
- Should `create-quick` pages (Google/Instagram import flow) be fully translated or remain English-only given their technical audience?
