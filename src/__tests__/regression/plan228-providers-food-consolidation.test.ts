// @vitest-environment node
/**
 * Plan 228 — /providers listing route consolidation into /food
 *
 * TDD: Tests written BEFORE implementation.
 * Validates:
 *   1. next.config.js has permanent redirect /providers -> /food
 *   2. Middleware allows /food routes in early access
 *   3. Middleware redirects to /food (not /providers) when waitlist redirect triggers
 *   4. /providers detail route remains intact
 *   5. Perf budget uses /food key
 *   6. Link references updated from /providers to /food
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../../');

// ─── 1. next.config.js redirect ────────────────────────────────────────────────
describe('next.config.js /providers -> /food redirect', () => {
  const src = readFileSync(resolve(ROOT, 'next.config.js'), 'utf-8');

  it('has a permanent redirect from /providers to /food', () => {
    // Should contain a redirect entry with source: '/providers' and destination: '/food'
    expect(src).toContain("source: '/providers'");
    expect(src).toContain("destination: '/food'");
    expect(src).toContain('permanent: true');
  });
});

// ─── 2. Middleware-utils: /food in APP_ROUTES and EARLY_ACCESS_ROUTES ─────────
describe('middleware-utils /food routes', () => {
  const src = readFileSync(resolve(ROOT, 'src/lib/middleware-utils.ts'), 'utf-8');

  it('includes /food in APP_ROUTES', () => {
    // /food should be listed in the APP_ROUTES array
    expect(src).toMatch(/APP_ROUTES\s*=\s*\[[\s\S]*?'\/food'[\s\S]*?\]/);
  });

  it('includes /food in EARLY_ACCESS_ROUTES', () => {
    expect(src).toMatch(/EARLY_ACCESS_ROUTES\s*=\s*\[[\s\S]*?'\/food'[\s\S]*?\]/);
  });

  it('special-cases /food for early-access bypass', () => {
    // The special-case block should mention /food alongside /providers
    expect(src).toContain("pathname === '/food'");
  });
});

// ─── 3. Middleware redirect target ──────────────────────────────────────────────
describe('middleware.ts redirect target', () => {
  const src = readFileSync(resolve(ROOT, 'src/middleware.ts'), 'utf-8');

  it('redirects to /food (not /providers) on waitlist redirect', () => {
    expect(src).toContain("'/food'");
    // Should NOT redirect to /providers anymore
    expect(src).not.toMatch(/redirect\(new URL\('\/providers'/);
  });
});

// ─── 4. providers/page.tsx removed ─────────────────────────────────────────────
describe('providers/page.tsx listing page removed', () => {
  it('providers/page.tsx should not exist', () => {
    const exists = (() => {
      try {
        readFileSync(resolve(ROOT, 'src/app/(public)/providers/page.tsx'), 'utf-8');
        return true;
      } catch {
        return false;
      }
    })();
    expect(exists).toBe(false);
  });

  it('providers/renderProvidersPage.tsx should still exist (used by /food)', () => {
    const exists = (() => {
      try {
        readFileSync(resolve(ROOT, 'src/app/(public)/providers/renderProvidersPage.tsx'), 'utf-8');
        return true;
      } catch {
        return false;
      }
    })();
    expect(exists).toBe(true);
  });
});

// ─── 5. food/ has loading.tsx and not-found.tsx ────────────────────────────────
describe('food/ directory has loading and not-found', () => {
  it('food/loading.tsx exists', () => {
    const exists = (() => {
      try {
        readFileSync(resolve(ROOT, 'src/app/(public)/food/loading.tsx'), 'utf-8');
        return true;
      } catch {
        return false;
      }
    })();
    expect(exists).toBe(true);
  });

  it('food/not-found.tsx exists and links to /food', () => {
    const src = readFileSync(resolve(ROOT, 'src/app/(public)/food/not-found.tsx'), 'utf-8');
    expect(src).toContain('href="/food"');
    // Should NOT link back to /providers
    expect(src).not.toContain('href="/providers"');
  });
});

// ─── 6. Link references updated ────────────────────────────────────────────────
describe('hardcoded /providers listing links updated to /food', () => {
  it('ExploreSection uses /food', () => {
    const src = readFileSync(resolve(ROOT, 'src/components/shared/ExploreSection.tsx'), 'utf-8');
    expect(src).toContain("'/food'");
    expect(src).toContain('href="/food"');
    expect(src).not.toContain("router.push('/providers')");
    expect(src).not.toContain('href="/providers"');
  });

  it('LandingHero uses /food', () => {
    const src = readFileSync(resolve(ROOT, 'src/components/shared/LandingHero.tsx'), 'utf-8');
    expect(src).toContain("'/food'");
    expect(src).not.toContain("router.push('/providers')");
  });

  it('HomeSearchBar navigates to /food', () => {
    const src = readFileSync(
      resolve(ROOT, 'src/features/search/components/HomeSearchBar.tsx'),
      'utf-8',
    );
    expect(src).toContain('/food?q=');
    expect(src).not.toContain('/providers?q=');
  });

  it('HomeSearchInput navigates to /food', () => {
    const src = readFileSync(
      resolve(ROOT, 'src/features/search/components/HomeSearchInput.tsx'),
      'utf-8',
    );
    expect(src).toContain('/food?q=');
    expect(src).not.toContain('/providers?q=');
  });

  it('UnifiedProviderCreateForm redirects to /food', () => {
    const src = readFileSync(
      resolve(ROOT, 'src/features/providers/UnifiedProviderCreateForm.tsx'),
      'utf-8',
    );
    expect(src).toContain("router.push('/food')");
    expect(src).not.toContain("router.push('/providers')");
  });

  it('manifest.json shortcut uses /food', () => {
    const src = readFileSync(resolve(ROOT, 'public/manifest.json'), 'utf-8');
    const manifest = JSON.parse(src);
    const browseShortcut = manifest.shortcuts?.find((s: { url: string }) => s.url === '/food');
    expect(browseShortcut).toBeTruthy();
    // Should NOT have /providers shortcut
    const oldShortcut = manifest.shortcuts?.find((s: { url: string }) => s.url === '/providers');
    expect(oldShortcut).toBeFalsy();
  });

  it('dashboard edit page uses /food for listing navigation', () => {
    const src = readFileSync(
      resolve(ROOT, 'src/app/(dashboard)/dashboard/providers/[id]/edit/page.tsx'),
      'utf-8',
    );
    // Listing-level navigation should use /food
    expect(src).toContain("router.push('/food')");
    expect(src).toContain('onBack="/food"');
    // Detail links like /providers/${id} should remain
    expect(src).toContain('/providers/${providerId}');
  });
});

// ─── 7. CityEarlyAccessNavbar home-active check ────────────────────────────────
describe('CityEarlyAccessNavbar /food active check', () => {
  const src = readFileSync(
    resolve(ROOT, 'src/components/shared/CityEarlyAccessNavbar.tsx'),
    'utf-8',
  );

  it('checks /food for home-active state', () => {
    expect(src).toContain("pathname === '/food'");
  });
});

// ─── 8. initialData section mismatch fix ────────────────────────────────────────
describe('ProvidersContent initialSection gate', () => {
  it('renderProvidersPage passes initialSection prop', () => {
    const src = readFileSync(
      resolve(ROOT, 'src/app/(public)/providers/renderProvidersPage.tsx'),
      'utf-8',
    );
    expect(src).toContain('initialSection={section}');
  });

  it('ProvidersContent accepts initialSection and gates initialData', () => {
    const src = readFileSync(
      resolve(ROOT, 'src/app/(public)/providers/ProvidersContent.tsx'),
      'utf-8',
    );
    expect(src).toContain('initialSection');
    expect(src).toContain('section === initialSection');
  });
});

// ─── 9. Perf budgets ────────────────────────────────────────────────────────────
describe('perf budgets updated', () => {
  it('budgets.json uses /food key instead of /providers', () => {
    const src = readFileSync(resolve(ROOT, 'scripts/perf/budgets.json'), 'utf-8');
    const budgets = JSON.parse(src);
    expect(budgets.routes['/food']).toBeTruthy();
    expect(budgets.routes['/providers']).toBeUndefined();
    // Detail route should remain
    expect(budgets.routes['/providers/[provider_id]']).toBeTruthy();
  });
});

// ─── 10. RootClientLayout discovery check ──────────────────────────────────────
describe('RootClientLayout isProvidersDiscovery', () => {
  const src = readFileSync(resolve(ROOT, 'src/components/layout/RootClientLayout.tsx'), 'utf-8');

  it('includes /food in discovery check', () => {
    expect(src).toContain("pathname === '/food'");
  });
});

// ─── 11. providers/not-found.tsx links to /food ────────────────────────────────
describe('providers/not-found.tsx updated link', () => {
  const src = readFileSync(resolve(ROOT, 'src/app/(public)/providers/not-found.tsx'), 'utf-8');

  it('links to /food instead of /providers', () => {
    expect(src).toContain('href="/food"');
    expect(src).not.toContain('href="/providers"');
  });
});

// ─── 12. Middleware functional test: /food allowed in early access ──────────────
describe('middleware-utils: /food allowed in early access', () => {
  it('/food should not redirect to waitlist', async () => {
    const { shouldRedirectToWaitlist } = await import('@/lib/middleware-utils');
    await expect(shouldRedirectToWaitlist('/food', false, undefined, undefined)).resolves.toBe(
      false,
    );
  });

  it('/providers should still not redirect (detail pages need it)', async () => {
    const { shouldRedirectToWaitlist } = await import('@/lib/middleware-utils');
    await expect(shouldRedirectToWaitlist('/providers', false, undefined, undefined)).resolves.toBe(
      false,
    );
  });
});
