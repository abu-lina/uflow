import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/roles', () => ({
  isAdminOrModerator: vi.fn(async () => false),
}));

import { shouldRedirectToWaitlist } from '@/lib/middleware-utils';

describe('#954 — /about accessible before launch', () => {
  it('AC1: /about does not redirect when isAppLaunched is false', async () => {
    await expect(shouldRedirectToWaitlist('/about', false, undefined, undefined)).resolves.toBe(
      false,
    );
  });

  it('AC3: gated route /manual-user still redirects when isAppLaunched is false', async () => {
    await expect(
      shouldRedirectToWaitlist('/manual-user', false, undefined, undefined),
    ).resolves.toBe(true);
  });
});
