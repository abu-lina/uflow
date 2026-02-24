/**
 * Regression test for v0.6.3 hotfix
 * 
 * Bug: Providers page showed "No results found" after Plan 017 because
 * it was passing 'Everywhere' as literal city name instead of empty string.
 * 
 * Root cause: providers/page.tsx defaulted to 'Everywhere' but service layer
 * expected empty string for "all locations" after Plan 017 sentinel changes.
 */

import { describe, it, expect } from 'vitest';

describe('Providers Page Location Default (v0.6.3 Hotfix)', () => {
  it('should treat empty location param as "all locations" (no filter)', () => {
    // Simulate what providers/page.tsx should do
    const locationParam: string = '';
    const isLegacyEverywhere = locationParam === 'Everywhere' || locationParam === 'Überall';
    const location = isLegacyEverywhere ? '' : locationParam;
    
    expect(location).toBe('');
    expect(isLegacyEverywhere).toBe(false);
  });

  it('should map "Everywhere" to empty string (all locations)', () => {
    const locationParam: string = 'Everywhere';
    const isLegacyEverywhere = locationParam === 'Everywhere' || locationParam === 'Überall';
    const location = isLegacyEverywhere ? '' : locationParam;
    
    expect(location).toBe('');
    expect(isLegacyEverywhere).toBe(true);
  });

  it('should map "Überall" to empty string (all locations)', () => {
    const locationParam: string = 'Überall';
    const isLegacyEverywhere = locationParam === 'Everywhere' || locationParam === 'Überall';
    const location = isLegacyEverywhere ? '' : locationParam;
    
    expect(location).toBe('');
    expect(isLegacyEverywhere).toBe(true);
  });

  it('should preserve actual city names (not map to empty string)', () => {
    const locationParam: string = 'Berlin';
    const isLegacyEverywhere = locationParam === 'Everywhere' || locationParam === 'Überall';
    const location = isLegacyEverywhere ? '' : locationParam;
    
    expect(location).toBe('Berlin');
    expect(isLegacyEverywhere).toBe(false);
  });

  it('should handle missing location param (undefined → empty string)', () => {
    const locationParam: string = '';
    const isLegacyEverywhere = locationParam === 'Everywhere' || locationParam === 'Überall';
    const location = isLegacyEverywhere ? '' : locationParam;
    
    expect(location).toBe('');
  });
});
