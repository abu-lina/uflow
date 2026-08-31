import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/roles', () => ({
  isAdminOrModerator: vi.fn(async () => false),
}));

import { shouldRedirectToWaitlist } from '@/lib/middleware-utils';

describe('Plan 123 Iteration 2 — middleware /profile exemption', () => {
  it('[pre-fix FAILS] should allow /profile in early-access mode for non-admin users', async () => {
    await expect(
      shouldRedirectToWaitlist('/profile', false, undefined, undefined),
    ).resolves.toBe(false);
  });

  it('[pre-fix FAILS] should allow /profile/edit in early-access mode for non-admin users', async () => {
    await expect(
      shouldRedirectToWaitlist('/profile/edit', false, undefined, undefined),
    ).resolves.toBe(false);
  });

  it('[regression guard] should keep /providers allowed in early-access mode', async () => {
    await expect(
      shouldRedirectToWaitlist('/providers', false, undefined, undefined),
    ).resolves.toBe(false);
  });

  it('[regression guard] should keep non-exempted app routes blocked in early-access mode', async () => {
    await expect(
      shouldRedirectToWaitlist('/about', false, undefined, undefined),
    ).resolves.toBe(true);
  });
});
