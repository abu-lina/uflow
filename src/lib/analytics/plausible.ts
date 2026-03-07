/**
 * Plausible Analytics Utility (Plan 035 — M1)
 *
 * Lightweight wrapper around the Plausible JS API.
 * Plausible is cookie-free and GDPR-compliant — no consent banner required.
 *
 * The global `plausible()` function is injected by the Plausible script tag
 * in the root layout. This utility provides a typed, safe wrapper.
 */

// Extend Window to include Plausible's global function
declare global {
  interface Window {
    plausible?: (
      eventName: string,
      options?: { props: Record<string, string | number | boolean> },
    ) => void;
  }
}

/**
 * Track a custom event in Plausible Analytics.
 *
 * Safe to call in SSR or when Plausible script hasn't loaded — silently no-ops.
 * No PII allowed in props (enforced by convention, not code).
 *
 * @param name - Event name (e.g., 'contact_intent_triggered', 'provider_profile_completed')
 * @param props - Optional properties (no PII, no free-text)
 */
export function trackEvent(
  name: string,
  props?: Record<string, string | number | boolean>,
): void {
  if (typeof window === 'undefined' || typeof window.plausible !== 'function') {
    return;
  }

  window.plausible(name, props ? { props } : undefined);
}
