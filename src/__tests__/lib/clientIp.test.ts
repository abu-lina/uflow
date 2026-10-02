import { describe, expect, it } from 'vitest';

import { getTrustedClientIp } from '@/lib/security/clientIp';

function headers(entries: Record<string, string>): Headers {
  return new Headers(entries);
}

describe('getTrustedClientIp', () => {
  it('prefers x-real-ip over a spoofed x-forwarded-for (attacker cannot pick their bucket)', () => {
    expect(
      getTrustedClientIp(
        headers({
          'x-real-ip': '203.0.113.10',
          'x-forwarded-for': '1.2.3.4',
        }),
      ),
    ).toBe('203.0.113.10');
  });

  it('uses the last x-forwarded-for hop, not the client-supplied first', () => {
    expect(getTrustedClientIp(headers({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2' }))).toBe('2.2.2.2');
  });

  it('never trusts cf-connecting-ip (client-controllable without real_ip_module)', () => {
    expect(getTrustedClientIp(headers({ 'cf-connecting-ip': '9.9.9.9' }))).toBe('unknown');
  });

  it('returns unknown when no trusted header is present', () => {
    expect(getTrustedClientIp(headers({}))).toBe('unknown');
  });

  it('treats empty and whitespace-only headers as absent', () => {
    expect(getTrustedClientIp(headers({ 'x-real-ip': '   ' }))).toBe('unknown');
    expect(getTrustedClientIp(headers({ 'x-forwarded-for': '  ' }))).toBe('unknown');
  });

  it('trims whitespace around header values', () => {
    expect(getTrustedClientIp(headers({ 'x-real-ip': '  203.0.113.5  ' }))).toBe('203.0.113.5');
    expect(getTrustedClientIp(headers({ 'x-forwarded-for': ' 1.1.1.1 ,  2.2.2.2 ' }))).toBe(
      '2.2.2.2',
    );
  });

  it('skips empty hops in x-forwarded-for', () => {
    expect(getTrustedClientIp(headers({ 'x-forwarded-for': '1.1.1.1, , 2.2.2.2' }))).toBe(
      '2.2.2.2',
    );
  });
});
