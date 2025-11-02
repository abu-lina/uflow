/**
 * Address validation utilities
 * Provides country-specific validation rules for addresses
 */

export interface AddressValidationResult {
  isValid: boolean;
  errors: {
    street?: string;
    zip?: string;
    city?: string;
    country?: string;
  };
}

/**
 * ZIP/Postal code patterns by country
 * Patterns are regex that validate the format
 */
const ZIP_PATTERNS: Record<string, RegExp> = {
  'Deutschland': /^\d{5}$/, // 5 digits
  'Germany': /^\d{5}$/,
  'United States': /^\d{5}(-\d{4})?$/, // 5 digits or 5+4 format
  'USA': /^\d{5}(-\d{4})?$/,
  'United Kingdom': /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i, // UK postcode format
  'UK': /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i,
  'France': /^\d{5}$/, // 5 digits
  'Canada': /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i, // Canadian postal code
  'Australia': /^\d{4}$/, // 4 digits
  'Austria': /^\d{4}$/, // 4 digits
  'Switzerland': /^\d{4}$/, // 4 digits
  'Netherlands': /^\d{4}\s?[A-Z]{2}$/i, // 4 digits + 2 letters
  'Belgium': /^\d{4}$/, // 4 digits
  'Italy': /^\d{5}$/, // 5 digits
  'Spain': /^\d{5}$/, // 5 digits
  'Poland': /^\d{2}-\d{3}$/, // 2 digits - 3 digits
  'Türkiye': /^\d{5}$/, // 5 digits
  'Turkey': /^\d{5}$/,
};

/**
 * Validates a ZIP code based on country
 * Returns error message if invalid, undefined if valid
 */
export function validateZipCode(zip: string, country: string): string | undefined {
  if (!zip || zip.trim() === '') {
    return undefined; // Empty is okay, validation happens at form level
  }

  // Normalize country name (handle variations)
  const normalizedCountry = normalizeCountryName(country);
  
  // If no pattern exists for this country, accept any non-empty value
  if (!ZIP_PATTERNS[normalizedCountry]) {
    return undefined;
  }

  const pattern = ZIP_PATTERNS[normalizedCountry];
  if (!pattern.test(zip.trim())) {
    return 'Invalid postal code format';
  }

  return undefined;
}

/**
 * Normalizes country names to match pattern keys
 */
function normalizeCountryName(country: string): string {
  const normalized = country.trim();
  
  // Handle common variations
  const variations: Record<string, string> = {
    'DE': 'Deutschland',
    'US': 'United States',
    'GB': 'United Kingdom',
    'FR': 'France',
    'CA': 'Canada',
    'AU': 'Australia',
    'AT': 'Austria',
    'CH': 'Switzerland',
    'NL': 'Netherlands',
    'BE': 'Belgium',
    'IT': 'Italy',
    'ES': 'Spain',
    'PL': 'Poland',
    'TR': 'Türkiye',
  };

  return variations[normalized] || normalized;
}

/**
 * Validates city name
 * Basic validation: non-empty, reasonable length
 */
export function validateCity(city: string): string | undefined {
  if (!city || city.trim() === '') {
    return 'City is required';
  }

  if (city.trim().length < 2) {
    return 'City name must be at least 2 characters';
  }

  if (city.trim().length > 100) {
    return 'City name is too long';
  }

  // Check for valid characters (letters, spaces, hyphens, apostrophes)
  if (!/^[a-zA-Z\s\-'äöüÄÖÜß]+$/.test(city.trim())) {
    return 'City name contains invalid characters';
  }

  return undefined;
}

/**
 * Validates street address
 * Basic validation: non-empty if provided, reasonable length
 */
export function validateStreet(street: string, isRequired: boolean = false): string | undefined {
  if (!street || street.trim() === '') {
    if (isRequired) {
      return 'Street address is required';
    }
    return undefined; // Street is optional
  }

  if (street.trim().length < 3) {
    return 'Street address must be at least 3 characters';
  }

  if (street.trim().length > 200) {
    return 'Street address is too long';
  }

  return undefined;
}

/**
 * Validates country name
 */
export function validateCountry(country: string): string | undefined {
  if (!country || country.trim() === '') {
    return 'Country is required';
  }

  if (country.trim().length < 2) {
    return 'Please enter a valid country name';
  }

  return undefined;
}

/**
 * Comprehensive address validation
 */
export function validateAddress(data: {
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
  isOnlineBusiness?: boolean;
}): AddressValidationResult {
  const errors: AddressValidationResult['errors'] = {};

  // Skip validation for online businesses
  if (data.isOnlineBusiness) {
    return { isValid: true, errors: {} };
  }

  // Validate country (required)
  const countryError = validateCountry(data.country || '');
  if (countryError) {
    errors.country = countryError;
  } else if (data.country) {
    // Validate ZIP if country is provided
    const zipError = validateZipCode(data.zip || '', data.country);
    if (zipError) {
      errors.zip = zipError;
    }
  }

  // Validate city (required)
  const cityError = validateCity(data.city || '');
  if (cityError) {
    errors.city = cityError;
  }

  // Street is optional but validate if provided
  const streetError = validateStreet(data.street || '', false);
  if (streetError) {
    errors.street = streetError;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

