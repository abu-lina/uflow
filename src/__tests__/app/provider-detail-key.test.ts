// @vitest-environment node
import { describe, it, expect } from 'vitest';
import fs from 'fs';

/**
 * Regression guard for #248 follow-up:
 * ProviderDetailPageClient must be keyed by provider ID so React remounts
 * when navigating /p/A -> /p/B (same dynamic route, different provider).
 * Without this key, stale state (selectedImageIdx, expandedBarakah,
 * showHalalPopup) persists across provider navigations.
 */
describe('Provider detail page — key by provider ID (#248)', () => {
  const source = fs.readFileSync('src/app/(public)/p/[id]/page.tsx', 'utf-8');

  it('keys ProviderDetailPageClient by provider ID for same-route remount', () => {
    // The key prop must use the destructured `id` param so React treats
    // /p/A and /p/B as different component instances.
    expect(source).toMatch(/ProviderDetailPageClient[\s\S]*?key\s*=\s*\{id\}/);
  });

  it('does NOT key by pathname (would cause full-page remount on every nav)', () => {
    expect(source).not.toMatch(/ProviderDetailPageClient[\s\S]*?key\s*=\s*\{pathname\}/);
  });
});
