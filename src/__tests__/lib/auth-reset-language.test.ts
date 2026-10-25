/** #722 review: password-reset emails use a supported auth-email language. */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({ supabase: { auth: {} } }));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { resetPasswordWithLanguage } from '@/lib/auth';

const json = (body: Record<string, unknown>) =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);

describe('resetPasswordWithLanguage email language (#722 review)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch.mockImplementation((url: string) =>
      url === '/api/check-email-exists' ? json({ confirmed: true }) : json({ success: true }),
    );
  });

  it.each([
    ['ur', 'en'],
    ['ps', 'en'],
    ['tr', 'tr'],
  ] as const)('sends %s as %s', async (ui, expected) => {
    await resetPasswordWithLanguage('user@example.com', ui);
    const call = mockFetch.mock.calls.find(([u]) => u === '/api/generate-confirmation-token');
    expect(JSON.parse(call?.[1].body).language).toBe(expected);
    expect(mockFetch.mock.calls.some(([u]) => u === '/api/send-auth-email')).toBe(false);
  });
});
