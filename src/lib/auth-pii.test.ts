import { afterEach, describe, expect, it, vi } from 'vitest';
import { signInWithMagicLink, signUpWithLanguage } from '@/lib/auth';

const EMAIL = 'pii-probe@example.test';
const IP = '203.0.113.77';

describe('auth client PII logging', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('masks email in signup logs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ userId: 'signup-user-1', email: EMAIL }),
      }),
    );
    const output = vi.spyOn(console, 'log').mockImplementation(() => {});

    await signUpWithLanguage(EMAIL, 'Password123!', 'en', '', true, true);

    const logs = JSON.stringify(output.mock.calls);
    expect(logs).not.toContain(EMAIL);
    expect(logs).toContain('p***@example.test');
  });

  it('masks IP and omits response debug data from magic-link error logs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({
          code: 'IP_BLOCKED',
          ip: IP,
          debug: { ip: IP, identifier: `ip:${IP}` },
          diagnosticUrl: `http://localhost/diagnostic?ip=${IP}`,
        }),
      }),
    );
    const output = vi.spyOn(console, 'error').mockImplementation(() => {});

    await signInWithMagicLink(EMAIL, 'en');

    const logs = JSON.stringify(output.mock.calls);
    expect(logs).not.toContain(IP);
    expect(logs).toContain('203.0.113.0');
  });
});
