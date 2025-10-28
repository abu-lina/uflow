/**
 * Translation Keys
 * 
 * Centralized constants for all translation keys to prevent typos
 * and improve IDE autocomplete support.
 */

export const TRANSLATION_KEYS = {
  // Common
  COMMON: {
    GREETING: 'common.greeting',
    SUPPORT_YOUR_UMMAH: 'common.supportYourUmmah',
    WELCOME: 'common.welcome',
    LOADING: 'common.loading',
    ERROR: 'common.error',
    SUCCESS: 'common.success',
    CANCEL: 'common.cancel',
    SAVE: 'common.save',
    DELETE: 'common.delete',
    EDIT: 'common.edit',
    CLOSE: 'common.close',
    BACK: 'common.back',
    NEXT: 'common.next',
    PREVIOUS: 'common.previous',
    SUBMIT: 'common.submit',
    CONFIRM: 'common.confirm',
    YES: 'common.yes',
    NO: 'common.no',
  },

  // Navigation
  NAV: {
    HOME: 'navigation.home',
    PROFILE: 'navigation.profile',
    SETTINGS: 'navigation.settings',
    LOGOUT: 'navigation.logout',
    LOGIN: 'navigation.login',
    REGISTER: 'navigation.register',
    ABOUT: 'navigation.about',
    CONTACT: 'navigation.contact',
  },

  // Auth
  AUTH: {
    LOGIN: 'auth.login',
    REGISTER: 'auth.register',
    LOGOUT: 'auth.logout',
    EMAIL: 'auth.email',
    PASSWORD: 'auth.password',
    CONFIRM_PASSWORD: 'auth.confirmPassword',
    FORGOT_PASSWORD: 'auth.forgotPassword',
    RESET_PASSWORD: 'auth.resetPassword',
    SIGN_IN: 'auth.signIn',
    SIGN_UP: 'auth.signUp',
    SIGN_OUT: 'auth.signOut',
    ALREADY_HAVE_ACCOUNT: 'auth.alreadyHaveAccount',
    DONT_HAVE_ACCOUNT: 'auth.dontHaveAccount',
    CREATE_ACCOUNT: 'auth.createAccount',
  },

  // Profile
  PROFILE: {
    PERSONAL_INFO: 'profile.personalInfo',
    FULL_NAME: 'profile.fullName',
    FIRST_NAME: 'profile.firstName',
    LAST_NAME: 'profile.lastName',
    EMAIL: 'profile.email',
    PHONE: 'profile.phone',
    ADDRESS: 'profile.address',
    CITY: 'profile.city',
    COUNTRY: 'profile.country',
    EDIT_PROFILE: 'profile.editProfile',
    CHANGE_PASSWORD: 'profile.changePassword',
    ACCOUNT_SETTINGS: 'profile.accountSettings',
  },

  // Landing
  LANDING: {
    HERO_TITLE: 'landing.hero.title',
    HERO_SUBTITLE: 'landing.hero.subtitle',
    HERO_GET_STARTED: 'landing.hero.getStarted',
    HERO_LEARN_MORE: 'landing.hero.learnMore',
    BISMILLAH_TRANSLATION: 'landing.bismillah.translation',
  },

  // Language
  LANGUAGE: {
    SWITCH_TO: 'language.switchTo',
    CURRENT: 'language.current',
    ENGLISH: 'language.english',
    GERMAN: 'language.german',
  },

  // Search
  SEARCH: {
    PLACEHOLDER: 'search.placeholder',
    ARIA_LABEL: 'search.ariaLabel',
    ALL: 'search.all',
    EVERYWHERE: 'search.everywhere',
    UNNAMED: 'search.unnamed',
  },

  // Categories
  CATEGORIES: {
    FOOD: 'categories.food',
    CLOTHING: 'categories.clothing',
    ELECTRONICS: 'categories.electronics',
    BOOKS: 'categories.books',
    SERVICES: 'categories.services',
    HEALTH: 'categories.health',
    EDUCATION: 'categories.education',
    TRANSPORTATION: 'categories.transportation',
  },

  // Actions
  ACTIONS: {
    SAVE: 'actions.save',
    SAVED: 'actions.saved',
    SAVING: 'actions.saving',
    SAVE_CHANGES: 'actions.saveChanges',
    NO_CHANGES: 'actions.noChanges',
    REMOVE_SAVED: 'actions.removeSaved',
  },

  // Providers
  PROVIDERS: {
    ERROR_LOADING: 'providers.errorLoading',
    ERROR_TITLE: 'providers.errorTitle',
    NO_RESULTS_FOUND: 'providers.noResultsFound',
    NO_RESULTS_DESCRIPTION: 'providers.noResultsDescription',
    LOADING_PROVIDERS: 'providers.loadingProviders',
    SEARCH_PROVIDERS: 'providers.searchProviders',
    ALL_PROVIDERS: 'providers.allProviders',
    BOOKMARKED_PROVIDERS: 'providers.bookmarkedProviders',
    SAVE: 'providers.save',
    SAVED: 'providers.saved',
    ADDRESS_TAP_TO_NAVIGATE: 'providers.addressTapToNavigate',
    ONLINE: 'providers.online',
    DONATIONS: 'providers.donations',
    INITIATIVES_SUPPORTED: 'providers.initiativesSupported',
    WE_OFFER: 'providers.weOffer',
    WE_NEED: 'providers.weNeed',
    SELECT_CATEGORY: 'providers.selectCategory',
  },
} as const;

// Type-safe helper to create custom keys
export type TranslationKey = {
  [K in keyof typeof TRANSLATION_KEYS]: typeof TRANSLATION_KEYS[K][keyof typeof TRANSLATION_KEYS[K]]
}[keyof typeof TRANSLATION_KEYS];


