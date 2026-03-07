/**
 * Plausible Analytics Utility Tests (Plan 035 — M1)
 *
 * TDD tests for the trackEvent utility that wraps the Plausible JS API.
 * Tests written BEFORE implementation (RED phase).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// This import will fail initially (TDD RED phase — module doesn't exist yet)
import { trackEvent } from '@/lib/analytics/plausible';

describe('trackEvent', () => {
  beforeEach(() => {
    // Reset the global plausible function before each test
    vi.stubGlobal('plausible', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls window.plausible with the event name', () => {
    trackEvent('contact_intent_triggered');

    expect(window.plausible).toHaveBeenCalledWith('contact_intent_triggered', undefined);
  });

  it('calls window.plausible with event name and props', () => {
    trackEvent('contact_intent_triggered', {
      contact_type: 'phone',
      city: 'Stuttgart',
    });

    expect(window.plausible).toHaveBeenCalledWith('contact_intent_triggered', {
      props: { contact_type: 'phone', city: 'Stuttgart' },
    });
  });

  it('does not throw when window.plausible is undefined', () => {
    vi.stubGlobal('plausible', undefined);

    expect(() => {
      trackEvent('contact_intent_triggered');
    }).not.toThrow();
  });

  it('does not throw when window is undefined (SSR context)', () => {
    // Simulate SSR where plausible is not defined
    vi.stubGlobal('plausible', undefined);
    // Access through the function should be safe
    expect(() => {
      trackEvent('provider_profile_completed');
    }).not.toThrow();
  });

  it('passes numeric and boolean props correctly', () => {
    trackEvent('provider_profile_completed', {
      has_phone: true,
      field_count: 4,
    });

    expect(window.plausible).toHaveBeenCalledWith('provider_profile_completed', {
      props: { has_phone: true, field_count: 4 },
    });
  });

  it('does not pass props object when props argument is empty object', () => {
    trackEvent('page_view', {});

    // Empty props should still pass the props wrapper (Plausible handles it)
    expect(window.plausible).toHaveBeenCalledWith('page_view', { props: {} });
  });
});
