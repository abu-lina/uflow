/**
 * Utility functions for handling navigation and maps integration
 */

import type { User } from '@supabase/supabase-js';

/**
 * Opens the device's default navigation app with the given address
 * @param address - The full address string
 */
export const openNavigation = (address: string): void => {
  if (!address.trim()) return;
  
  // Encode the address for URL
  const encodedAddress = encodeURIComponent(address);
  
  // Try different navigation schemes based on device capabilities
  const navigationUrls = [
    // Universal Google Maps URL (works on all platforms)
    `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`,
    // Apple Maps (iOS/macOS)
    `http://maps.apple.com/?q=${encodedAddress}`,
    // Android Maps intent
    `geo:0,0?q=${encodedAddress}`,
  ];
  
  // For mobile devices, try to detect and use the appropriate scheme
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  
  let targetUrl = navigationUrls[0]; // Default to Google Maps
  
  if (isIOS) {
    targetUrl = navigationUrls[1]; // Apple Maps for iOS
  } else if (isAndroid) {
    targetUrl = navigationUrls[2]; // Android geo intent
  }
  
  // Open the navigation app
  window.open(targetUrl, '_blank');
};

/**
 * Generates a formatted address string from provider address components
 * @param street - Street address
 * @param zip - ZIP/Postal code
 * @param city - City name
 * @returns Formatted address string
 */
export const formatAddress = (street?: string, zip?: string, city?: string): string => {
  const parts = [];
  
  if (street) parts.push(street);
  if (zip && city) {
    parts.push(`${zip} ${city}`);
  } else if (city) {
    parts.push(city);
  } else if (zip) {
    parts.push(zip);
  }
  
  return parts.join(', ');
};

/**
 * Checks if an address is complete enough for navigation
 * @param street - Street address
 * @param zip - ZIP/Postal code
 * @param city - City name
 * @returns True if address has enough information for navigation
 */
export const isAddressNavigable = (street?: string, zip?: string, city?: string): boolean => {
  return !!(street || (zip && city) || city);
};

/**
 * Normalizes Instagram URL/username to a valid Instagram URL
 * @param instagram - Instagram username or URL
 * @returns Properly formatted Instagram URL or null if invalid
 */
export const normalizeInstagramUrl = (instagram: string | null | undefined): string | null => {
  if (!instagram || !instagram.trim()) return null;
  
  const trimmed = instagram.trim();
  
  // If it's already a full URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // Ensure it's an instagram.com URL
    if (trimmed.includes('instagram.com/')) {
      return trimmed;
    }
    // If it's a URL but not Instagram, return null
    return null;
  }
  
  // Remove @ symbol if present
  const username = trimmed.replace(/^@/, '');
  
  // Remove any trailing or leading slashes
  const cleanUsername = username.replace(/^\/+|\/+$/g, '');
  
  // Validate username format (alphanumeric, dots, underscores only)
  if (!/^[a-zA-Z0-9._]+$/.test(cleanUsername)) {
    return null;
  }
  
  // Return properly formatted Instagram URL
  return `https://www.instagram.com/${cleanUsername}`;
};

/**
 * Normalizes website URL to ensure it has a proper protocol
 * @param website - Website URL
 * @returns Properly formatted website URL or null if invalid
 */
export const normalizeWebsiteUrl = (website: string | null | undefined): string | null => {
  if (!website || !website.trim()) return null;
  
  const trimmed = website.trim();
  
  // If it already has a protocol, return as is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  
  // Add https:// if no protocol is present
  return `https://${trimmed}`;
};

/**
 * Navigation utilities for layout and routing logic
 */

/**
 * Check if user has completed onboarding (earlyAccessUnlocked + city selected)
 * This is the single source of truth for onboarding completion status.
 * 
 * IMPORTANT: Returns false if onboarding is not complete (safe default)
 * 
 * @returns True if user has completed onboarding (earlyAccessUnlocked + city selected)
 */
export function hasCompletedOnboarding(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    // Check onboarding state - if no state exists, user hasn't completed onboarding
    const onboardingStateStr = localStorage.getItem('ummahflow_onboarding');
    if (!onboardingStateStr) {
      return false;
    }

    const onboardingState = JSON.parse(onboardingStateStr);
    
    // Must have earlyAccessUnlocked flag
    if (!onboardingState?.earlyAccessUnlocked) {
      return false;
    }

    // Must have a selected city (in either localStorage or sessionStorage)
    const selectedCity = localStorage.getItem('selectedCity') || sessionStorage.getItem('selectedCity');
    if (!selectedCity) {
      return false;
    }

    // Both conditions met - onboarding is complete
    return true;
  } catch (error) {
    // On any error, assume onboarding is not complete (safe default)
    console.error('[NavigationUtils] Failed to check onboarding state:', error);
    return false;
  }
}

/**
 * Determines if the current pathname should show the mobile footer bar
 * @param pathname - Current pathname
 * @param isSplashVisible - Whether splash screen is visible
 * @param user - Current authenticated user (null for early access or guests)
 * @param isAppLaunched - Whether app is launched (Stage 3 - Full Access)
 * @param stage - Current app stage ('stage1' | 'stage2' | 'stage3' | 'onboarding' | 'loading')
 * @returns True if mobile footer should be shown
 */
export const shouldShowMobileFooter = (
  pathname: string,
  isSplashVisible: boolean,
  user: User | null,
  isAppLaunched: boolean = false,
  stage?: 'stage1' | 'stage2' | 'stage3' | 'onboarding' | 'loading'
): boolean => {
  // 1. Stage 3 (Full Access): Show footer if app is launched OR stage is stage3 (provider count >= 15)
  // This bypasses onboarding check since Stage 3 means full access
  const isStage3 = isAppLaunched || stage === 'stage3';
  if (isStage3) {
    // For Stage 3, only check excluded pages (splash should not block footer in Stage 3)
    // Note: Splash screen check removed for Stage 3 since it's full access
    
    // Check excluded pages (pages that never show footer)
    const footerExcludedPages = ['/signup/check-email', '/waitlist'];
    if (footerExcludedPages.includes(pathname)) {
      return false;
    }

    // Check excluded patterns (page patterns that never show footer)
    const footerExcludedPatterns = [
      '/providers/',
      '/community-services/',
      '/profile/providers/',
      '/create/media/images',
      '/create/media/social',
      '/profile/edit',
      '/profile/delete',
    ];
    if (footerExcludedPatterns.some(pattern => pathname.includes(pattern))) {
      return false;
    }

    // Hide footer for create subpages (action menu will be shown instead)
    if (pathname.startsWith('/create') && pathname !== '/create') {
      return false;
    }

    // Stage 3: Show footer (full access)
    return true;
  }

  // 2. For Stages 1 & 2: Check onboarding completion
  // This ensures footer NEVER shows during onboarding for early access stages
  const onboardingComplete = hasCompletedOnboarding();
  
  if (!onboardingComplete) {
    // Hide footer if onboarding is not complete for early access stages
    return false;
  }

  // 3. Hide footer when splash is visible (even for returning users)
  if (isSplashVisible) {
    return false;
  }

  // 4. Check excluded pages (pages that never show footer)
  const footerExcludedPages = ['/signup/check-email', '/waitlist'];
  if (footerExcludedPages.includes(pathname)) {
    return false;
  }

  // 5. Check excluded patterns (page patterns that never show footer)
  const footerExcludedPatterns = [
    '/providers/',
    '/community-services/',
    '/profile/providers/',
    '/create/media/images',
    '/create/media/social',
    '/profile/edit',
    '/profile/delete',
  ];
  if (footerExcludedPatterns.some(pattern => pathname.includes(pattern))) {
    return false;
  }

  // 6. Hide footer for create subpages (action menu will be shown instead)
  if (pathname.startsWith('/create') && pathname !== '/create') {
    return false;
  }

  // 7. Stages 1 & 2 (Early Access): Hide footer (CityEarlyAccessNavbar will be shown instead)
  // Also hide for unauthenticated users in non-launched app
  if (!user) {
    return false;
  }

  // 8. Default: Show footer for authenticated users in early access
  return true;
};

/**
 * Determines if the current pathname is a subpage that should show action button
 * @param pathname - Current pathname
 * @returns True if subpage action button should be shown
 */
export const shouldShowSubpageAction = (pathname: string): boolean => {
  // Signup subpages (except main signup and check-email)
  if (pathname.includes('/signup/') && pathname !== '/signup' && pathname !== '/signup/check-email') {
    return true;
  }

  // Login subpages (except main login)
  if (pathname.includes('/login/') && pathname !== '/login') {
    return true;
  }

  // Profile subpages (except main profile, edit, delete, provider detail pages, and edit pages that have custom buttons)
  if (pathname.includes('/profile/') && 
      pathname !== '/profile' && 
      !pathname.includes('/profile/edit') && 
      !pathname.includes('/profile/delete') &&
      !pathname.match(/^\/profile\/providers\/[^/]+$/) && // Exclude provider detail pages (they have custom FooterAction)
      !pathname.match(/^\/profile\/providers\/[^/]+\/edit$/)) { // Exclude provider edit pages (they have custom FooterAction)
    return true;
  }

  // Create subpages are excluded from subpage action button
  // Create pages have their own FooterAction components (e.g., ProviderCreateForm)
  // and should not show RootClientLayout's FooterAction to avoid event handler conflicts
  // The navigation menu is already hidden by shouldShowMobileFooter for create subpages

  return false;
};

/**
 * Determines if the current pathname is a provider detail page
 * @param pathname - Current pathname
 * @returns True if it's a provider detail page
 */
export const isProviderDetailPage = (pathname: string): boolean => {
  return (pathname.startsWith('/providers/') && pathname !== '/providers') || 
         pathname.startsWith('/profile/providers/');
};

/**
 * Determines if CityEarlyAccessNavbar should be shown
 * @param pathname - Current pathname
 * @param isAppLaunched - Whether app is launched (Stage 3)
 * @param user - Current authenticated user
 * @param stage - Current app stage ('stage1' | 'stage2' | 'stage3' | 'onboarding' | 'loading')
 * @returns True if CityEarlyAccessNavbar should be shown
 */
export const shouldShowCityEarlyAccessNavbar = (
  pathname: string,
  isAppLaunched: boolean,
  _user: User | null,
  stage?: 'stage1' | 'stage2' | 'stage3' | 'onboarding' | 'loading'
): boolean => {
  // Never show in Stage 3 (Full Access) - either from isAppLaunched or provider count >= 15
  const isStage3 = isAppLaunched || stage === 'stage3';
  if (isStage3) {
    return false;
  }

  // Check if onboarding is complete
  const onboardingComplete = hasCompletedOnboarding();

  // Show on root if onboarding is complete
  if (pathname === '/' && onboardingComplete) {
    return true;
  }

  // Hide on onboarding pages if onboarding is not complete
  const onboardingPages = ['/', '/about', '/welcome'];
  if (onboardingPages.includes(pathname) && !onboardingComplete) {
    return false;
  }

  // Hide on excluded pages
  const excludedPages = [
    '/about',
    '/city-selection', // Always hide navbar on city selection page
    '/signup/check-email',
    '/waitlist',
    '/welcome',
  ];

  const excludedPatterns = [
    '/providers/', // Provider detail pages
    '/community-services/', // Community service detail pages
    '/profile/providers/', // Profile provider detail pages
    '/create/media/images',
    '/create/media/social',
    '/create/recommend', // Recommendation flow pages (have their own navigation)
    '/profile/edit',
    '/profile/delete',
  ];

  if (excludedPages.includes(pathname)) {
    return false;
  }

  if (excludedPatterns.some(pattern => pathname.includes(pattern))) {
    return false;
  }

  // Show on: /, /city/*, /providers, /create (and subpages that don't match excluded patterns)
  return true;
};

/**
 * Determines various page type classifications for layout logic
 * @param pathname - Current pathname
 * @returns Object with page type flags
 */
export const getPageType = (pathname: string) => {
  const isLandingPage = pathname === '/';
  const isAboutPage = pathname === '/about';
  const isProviderDetail = isProviderDetailPage(pathname);
  const isCategoryPage = pathname === '/create/basics/category';
  const isSubpage = shouldShowSubpageAction(pathname);

  return {
    isLandingPage,
    isAboutPage,
    isProviderDetail,
    isCategoryPage,
    isSubpage,
  };
};
