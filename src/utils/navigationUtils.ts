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
