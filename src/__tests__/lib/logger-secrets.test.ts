import { afterEach, describe, expect, it, vi } from 'vitest';
import { inspect } from 'node:util';
import { logApi, logApp, logAuth } from '@/lib/logger';
import { redactEmails, redactError } from '@/lib/logging/redact-pii';

const SECRETS = {
  token: 'FAKE-token-value-669',
  password: 'FAKE-password-value-669',
  accessToken: 'FAKE-access-token-value-669',
  refreshToken: 'FAKE-refresh-token-value-669',
  otp: 'FAKE-otp-value-669',
  session: { id: 'FAKE-session-value-669' },
};
const SECRET_VALUES = [
  SECRETS.token,
  SECRETS.password,
  SECRETS.accessToken,
  SECRETS.refreshToken,
  SECRETS.otp,
  SECRETS.session.id,
];

const IPV4 = '203.0.113.77';
const IPV6 = '2001:db8::1';

function output(spy: ReturnType<typeof vi.spyOn>): string {
  return [JSON.stringify(spy.mock.calls), inspect(spy.mock.calls, { depth: Infinity })].join('\n');
}

const loggers = [
  ['logAuth', logAuth],
  ['logApi', logApi],
  ['logApp', logApp],
] as const;

describe.each(['production', 'development'] as const)('logger in %s (#669)', (nodeEnv) => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it.each(loggers)('AC4: %s masks secret-bearing keys, top-level and nested', (_name, logger) => {
    vi.stubEnv('NODE_ENV', nodeEnv);
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger('info', {
      event: 'secret_probe',
      route: '/api/probe',
      ...SECRETS,
      nested: { ...SECRETS, deeper: [{ ...SECRETS }] },
    });

    const logged = output(spy);
    expect(SECRET_VALUES.filter((value) => logged.includes(value))).toEqual([]);
    expect(logged).toContain('secret_probe');
  });

  it.each(loggers)('AC5: %s masks free-text IPs', (_name, logger) => {
    vi.stubEnv('NODE_ENV', nodeEnv);
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger('info', {
      event: `request from ${IPV4} and ${IPV6} failed`,
      route: '/api/probe',
      error: `upstream ${IPV6} refused ${IPV4}`,
    });

    const logged = output(spy);
    expect(logged).not.toContain(IPV4);
    expect(logged).not.toContain(IPV6);
  });
});

describe('AC5: free-text IPs are masked by the shared redactor', () => {
  it('redactEmails masks IPv4 and IPv6 in a message', () => {
    const text = redactEmails(`client ${IPV4} via ${IPV6}, retry at 10:15:30`);

    expect(text).not.toContain(IPV4);
    expect(text).not.toContain(IPV6);
    expect(text).toContain('10:15:30');
  });

  it('redactError masks IPs in error text', () => {
    const redacted = JSON.stringify(
      redactError({ message: `connect ECONNREFUSED ${IPV4}`, details: `from ${IPV6}` }),
    );

    expect(redacted).not.toContain(IPV4);
    expect(redacted).not.toContain(IPV6);
  });
});
