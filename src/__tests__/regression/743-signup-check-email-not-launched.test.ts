import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/roles', () => ({
  isAdminOrModerator: vi.fn(async () => false),
}));

import { shouldRedirectToWaitlist } from '@/lib/middleware-utils';

describe('#743 confirm-email screen is reachable before launch', () => {
  it('does not redirect an anonymous /signup/check-email visit to /food when the app is not launched', async () => {
    await expect(
      shouldRedirectToWaitlist('/signup/check-email', false, undefined, undefined),
    ).resolves.toBe(false);
  });

  it('keeps /signup reachable', async () => {
    await expect(shouldRedirectToWaitlist('/signup', false, undefined, undefined)).resolves.toBe(
      false,
    );
  });

  it('keeps other non-exempted app routes blocked', async () => {
    await expect(shouldRedirectToWaitlist('/about', false, undefined, undefined)).resolves.toBe(
      true,
    );
  });
});
