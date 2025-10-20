/**
 * Utility functions for handling navigation and maps integration
 */

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
 * Determines if the current pathname should show the mobile footer bar
 * @param pathname - Current pathname
 * @param isSplashVisible - Whether splash screen is visible
 * @param user - Current user object (can be null)
 * @returns True if mobile footer should be shown
 */
export const shouldShowMobileFooter = (
  pathname: string,
  isSplashVisible: boolean,
  user: unknown
): boolean => {
  // Pages that should never show the footer
  const footerExcludedPages = [
    '/about',
    '/signup/check-email',
  ];

  // Page patterns that should not show the footer
  const footerExcludedPatterns = [
    '/providers/', // Provider detail pages
    '/profile/providers/', // Profile provider detail pages
    '/create/media/images',
    '/create/media/social',
    '/profile/edit',
    '/profile/delete',
  ];

  // Check if current path is in excluded pages
  if (footerExcludedPages.includes(pathname)) {
    return false;
  }

  // Check if current path matches excluded patterns
  const matchesExcludedPattern = footerExcludedPatterns.some(pattern => 
    pathname.includes(pattern)
  );

  if (matchesExcludedPattern) {
    return false;
  }

  // Don't show footer when splash is visible
  if (isSplashVisible) {
    return false;
  }

  // Special case: Don't show footer for create pages when user is logged in
  if (user && pathname.startsWith('/create') && pathname !== '/create') {
    return false;
  }

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

  // Profile subpages (except main profile, edit, delete)
  if (pathname.includes('/profile/') && 
      pathname !== '/profile' && 
      !pathname.includes('/profile/edit') && 
      !pathname.includes('/profile/delete')) {
    return true;
  }

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
