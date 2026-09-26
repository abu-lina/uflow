// @vitest-environment jsdom
/**
 * Issue #415 / Plan 255 chunk C4 — the create entry point
 *
 * Validates:
 *   AC2    "+" sits in both mobile navbars and routes to /create (chooser),
 *          not /create/recommend; both navbars agree on the target so the
 *          fork cannot drift
 *   AC3    CreateIcon matches its post-#227 siblings (crossfade, same size)
 *          and uses currentColor + token classes instead of hardcoded hex
 *   AC4    the chooser sets creationMode BEFORE navigating, /recommend-provider
 *          is gone, and both branches gate unauthenticated users
 *   nav    MobileFooterBar fits 4 tabs at 320/360/430px (responsive gap)
 *   DB     migration 130's client insert branch blocks third-party
 *          provider_owner_id assignment
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../../');
const readSrc = (p: string) => readFileSync(resolve(ROOT, p), 'utf-8');

const NAVBAR_FILES = [
  'src/components/shared/CityEarlyAccessNavbar.tsx',
  'src/components/common/MobileFooterBar.tsx',
];

describe('AC2: "+" nav entry routes to the /create chooser', () => {
  it('both navbars link the create item to /create, not /create/recommend', () => {
    for (const file of NAVBAR_FILES) {
      const src = readSrc(file);
      // Link href in one navbar, navItems entry in the other — same target
      expect(src, file).toMatch(/href[=:]\s*['"]\/create['"]/);
      expect(src, file).not.toContain('/create/recommend');
    }
  });

  it('MobileFooterBar has 4 tabs: Home, Create, Saved, Profile in order', () => {
    const src = readSrc('src/components/common/MobileFooterBar.tsx');
    const order = ['Home', 'Create', 'Saved', 'Profile'];
    let lastIndex = -1;
    for (const label of order) {
      const index = src.indexOf(`label: '${label}'`);
      expect(index, `${label} missing`).toBeGreaterThan(-1);
      expect(index, `${label} out of order`).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }
    expect(src).toContain("href: '/create'");
    expect(src).toContain('CreateIcon');
  });

  it('Create active state covers the whole /create subtree in both navbars', () => {
    for (const file of NAVBAR_FILES) {
      const src = readSrc(file);
      expect(src, file).toContain("pathname.startsWith('/create')");
    }
  });
});

describe('nav overflow: MobileFooterBar fits 4 tabs at 320/360/430px', () => {
  // 4 tabs x 40px = 160px. Inner width = viewport - 48px (px-6 each side).
  // gap-6 (24px): 160 + 3*24 = 232px — fits 320 (272px inner), 360 (312), 430 (382).
  // The old gap-10 (40px) needed 280px and overflowed at 320px.
  it('uses a responsive gap that is narrow below the sm breakpoint', () => {
    const src = readSrc('src/components/common/MobileFooterBar.tsx');
    expect(src).toContain('gap-6 sm:gap-10');
    expect(src).not.toMatch(/justify-center\s+gap-10(?!-)/);
  });
});

describe('AC3: CreateIcon matches post-#227 siblings', () => {
  const src = readSrc('src/components/ui/icons/CreateIcon.tsx');

  it('uses the opacity crossfade (two SVGs, no conditional branch)', () => {
    expect((src.match(/<svg/g) || []).length).toBe(2);
    expect(src).toContain('transition-opacity');
    expect(src).not.toMatch(/if\s*\(\s*isActive\s*\)/);
  });

  it('keeps the existing 49x48 dimensions (no size change)', () => {
    expect(src.match(/height="48"/g)?.length).toBe(2);
    expect(src.match(/width="49"/g)?.length).toBe(2);
    expect(src).toContain('viewBox="0 0 49 48"');
    expect(src).toContain('width: 48, height: 48');
  });

  it('uses currentColor and token classes instead of hardcoded hex strokes', () => {
    expect(src).not.toContain('#777777');
    expect(src).not.toContain('#589D96');
    expect(src.match(/stroke="currentColor"/g)?.length).toBe(2);
    expect(src).toContain('text-primary');
    expect(src).toContain('text-content-muted');
  });
});

describe('desktop header create affordance', () => {
  it('renders a "+" link to /create for all users with a t() accessible name', () => {
    const src = readSrc('src/components/layout/Header.tsx');
    expect(src).toContain('href="/create"');
    expect(src).toContain("t('navigation.create')");
    expect(src).toContain('aria-label');
    // rendered before the auth conditional so anonymous users see it too
    const createIndex = src.indexOf('href="/create"');
    const authIndex = src.indexOf(') : user ? (');
    expect(createIndex).toBeGreaterThan(-1);
    expect(authIndex).toBeGreaterThan(createIndex);
  });
});

describe('AC4: chooser routing and creationMode', () => {
  it('the chooser sets creationMode before navigating, for both branches', () => {
    const src = readSrc('src/app/(public)/create/page.tsx');
    const ownerSet = src.indexOf("setCreationMode('owner')");
    const ownerNav = src.indexOf("router.push('/create/basics')");
    const recSet = src.indexOf("setCreationMode('recommendation')");
    const recNav = src.indexOf("router.push('/create/recommend')");
    expect(ownerSet).toBeGreaterThan(-1);
    expect(ownerSet).toBeLessThan(ownerNav);
    expect(recSet).toBeGreaterThan(-1);
    expect(recSet).toBeLessThan(recNav);
    expect(src).not.toContain('/recommend-provider');
  });

  it('the chooser has a visible back affordance', () => {
    const src = readSrc('src/app/(public)/create/page.tsx');
    expect(src).toContain('variant="back-and-title"');
    expect(src).toContain('onBack');
  });

  it('/recommend-provider is deleted and nothing references it', () => {
    expect(existsSync(resolve(ROOT, 'src/app/(public)/recommend-provider/page.tsx'))).toBe(false);
    for (const file of [
      'src/app/(public)/create/page.tsx',
      'src/lib/middleware-utils.ts',
      'src/app/(public)/create/basics/page.tsx',
    ]) {
      expect(readSrc(file), file).not.toContain('recommend-provider');
    }
  });

  it('basics page asserts owner mode unconditionally and gates anonymous users', () => {
    const src = readSrc('src/app/(public)/create/basics/page.tsx');
    // no recommendation-mode escape hatch remains
    expect(src).not.toContain("creationMode === 'recommendation'");
    expect(src).toContain("setCreationMode('owner')");
    expect(src).toContain('if (!user)');
    expect(src).toContain('returnUrl');
  });
});

describe('migration 130: client cannot claim third-party ownership', () => {
  it('constrains provider_owner_id in the client insert branch', () => {
    const sql = readSrc('supabase/migrations/130_provider_submission_policies.sql');
    const insertPolicy = sql.slice(
      sql.indexOf('CREATE POLICY "Allow provider inserts"'),
      sql.indexOf('CREATE POLICY "Public can view'),
    );
    expect(insertPolicy).toContain(
      '"provider_owner_id" IS NULL) OR ("provider_owner_id" = ( SELECT "auth"."uid"()',
    );
    // the guard sits inside the client branch, after the pending constraint,
    // while the admin/moderator EXISTS branch precedes it
    const adminBranch = insertPolicy.indexOf("'moderator'");
    const ownerGuard = insertPolicy.indexOf('"provider_owner_id" IS NULL');
    expect(adminBranch).toBeGreaterThan(-1);
    expect(ownerGuard).toBeGreaterThan(adminBranch);
  });
});
