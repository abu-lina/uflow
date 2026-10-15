import { afterEach, describe, expect, it, vi } from 'vitest';
import { logApi, logApp, logAuth } from '@/lib/logger';

describe.each([
  ['production', 'production'],
  ['development', 'development'],
] as const)('structured loggers in %s', (_name, nodeEnv) => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it.each([
    ['logAuth', logAuth],
    ['logApi', logApi],
    ['logApp', logApp],
  ] as const)('%s redacts email and IP context', (_loggerName, logger) => {
    vi.stubEnv('NODE_ENV', nodeEnv);
    const output = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger('info', {
      event: 'pii_redaction_probe',
      route: '/api/probe',
      email: 'pii-probe@example.test',
      ip: '203.0.113.77',
    });

    const serializedOutput = JSON.stringify(output.mock.calls);
    expect(serializedOutput).not.toContain('pii-probe@example.test');
    expect(serializedOutput).not.toContain('203.0.113.77');
    expect(serializedOutput).toContain('p***@example.test');
    expect(serializedOutput).toContain('203.0.113.0');
  });

  it.each([
    ['logAuth', logAuth],
    ['logApi', logApi],
    ['logApp', logApp],
  ] as const)('AC5: %s redacts identifier and nested recipient keys', (_loggerName, logger) => {
    vi.stubEnv('NODE_ENV', nodeEnv);
    const output = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger('info', {
      event: 'pii_redaction_probe',
      route: '/api/probe',
      identifier: 'ip:203.0.113.77',
      nested: { to: 'pii-probe@example.test' },
    });

    const serializedOutput = JSON.stringify(output.mock.calls);
    expect(serializedOutput).not.toContain('pii-probe@example.test');
    expect(serializedOutput).not.toContain('203.0.113.77');
  });

  it.each([
    ['logAuth', logAuth],
    ['logApi', logApi],
    ['logApp', logApp],
  ] as const)('AC5: %s masks every PII key at any depth', (_loggerName, logger) => {
    vi.stubEnv('NODE_ENV', nodeEnv);
    const output = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger('info', {
      event: 'pii_redaction_probe',
      route: '/api/probe',
      a: {
        email: 'pii-probe@example.test',
        ip: '203.0.113.77',
        b: [
          { identifier: 'ip:203.0.113.77', clientIp: '203.0.113.77' },
          { c: { to: 'pii-probe@example.test', recipient: 'pii-probe@example.test' } },
        ],
      },
      userEmail: 'pii-probe@example.test',
    });

    const serializedOutput = JSON.stringify(output.mock.calls);
    expect(serializedOutput).not.toContain('pii-probe@example.test');
    expect(serializedOutput).not.toContain('203.0.113.77');
    expect(serializedOutput).toContain('pii_redaction_probe');
  });

  it.each([
    ['logAuth', logAuth],
    ['logApi', logApi],
    ['logApp', logApp],
  ] as const)('%s masks PII keys regardless of case', (_loggerName, logger) => {
    vi.stubEnv('NODE_ENV', nodeEnv);
    const output = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger('info', {
      event: 'pii_redaction_probe',
      route: '/api/probe',
      Email: 'pii-probe@example.test',
      IP: '203.0.113.77',
      nested: {
        clientIP: '203.0.113.77',
        USEREMAIL: 'pii-probe@example.test',
        Identifier: 'ip:203.0.113.77',
      },
    });

    const serializedOutput = JSON.stringify(output.mock.calls);
    expect(serializedOutput).not.toContain('pii-probe@example.test');
    expect(serializedOutput).not.toContain('203.0.113.77');
    expect(serializedOutput).toContain('203.0.113.0');
  });

  it.each([
    ['logAuth', logAuth],
    ['logApi', logApi],
    ['logApp', logApp],
  ] as const)('AC6: %s scrubs emails embedded in error text', (_loggerName, logger) => {
    vi.stubEnv('NODE_ENV', nodeEnv);
    const output = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger('error', {
      event: 'pii_redaction_probe',
      route: '/api/probe',
      error: 'duplicate key for pii-probe@example.test',
    });

    const serializedOutput = JSON.stringify(output.mock.calls);
    expect(serializedOutput).not.toContain('pii-probe@example.test');
    expect(serializedOutput).toContain('duplicate key for');
  });
});
