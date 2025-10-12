/**
 * Feature flags configuration
 * Controls which features are enabled/disabled in the application
 */

export interface FeatureFlags {
  // Debug features
  splashScreenDebug: boolean;
  pwaPromptDebug: boolean;
  
  // UI features
  enablePWAInstallPrompt: boolean;
  enableAddressVisibilityToggle: boolean;
  
  // Development features
  enableDebugMode: boolean;
}

/**
 * Default feature flags configuration
 * Set to false to disable features by default
 */
export const defaultFeatureFlags: FeatureFlags = {
  // Debug features - disabled by default
  splashScreenDebug: true,
  pwaPromptDebug: false,
  
  // UI features - enabled by default
  enablePWAInstallPrompt: true,
  enableAddressVisibilityToggle: false, // Disabled by default
  
  // Development features - disabled by default
  enableDebugMode: false,
};

/**
 * Get feature flag value with fallback to default
 */
export function getFeatureFlag<K extends keyof FeatureFlags>(
  key: K,
  overrides?: Partial<FeatureFlags>
): FeatureFlags[K] {
  // Check for environment variable override first
  const envKey = `NEXT_PUBLIC_FEATURE_${key.toUpperCase()}`;
  const envValue = process.env[envKey];
  
  if (envValue !== undefined) {
    return envValue === 'true';
  }
  
  // Check for runtime overrides
  if (overrides && key in overrides && overrides[key] !== undefined) {
    return overrides[key] as FeatureFlags[K];
  }
  
  // Return default value
  return defaultFeatureFlags[key];
}

/**
 * Get all feature flags with overrides
 */
export function getAllFeatureFlags(overrides?: Partial<FeatureFlags>): FeatureFlags {
  return {
    splashScreenDebug: getFeatureFlag('splashScreenDebug', overrides),
    pwaPromptDebug: getFeatureFlag('pwaPromptDebug', overrides),
    enablePWAInstallPrompt: getFeatureFlag('enablePWAInstallPrompt', overrides),
    enableAddressVisibilityToggle: getFeatureFlag('enableAddressVisibilityToggle', overrides),
    enableDebugMode: getFeatureFlag('enableDebugMode', overrides),
  };
}

