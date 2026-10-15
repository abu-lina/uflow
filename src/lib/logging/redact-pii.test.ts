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
});
