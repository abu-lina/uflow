import { describe, expect, it } from 'vitest';
import { maskEmail, maskIp } from '@/lib/logging/redact-pii';

describe('maskEmail', () => {
  it('masks the local part and preserves the domain', () => {
    expect(maskEmail('user@example.com')).toBe('u***@example.com');
  });

  it('redacts empty input', () => {
    expect(maskEmail('')).toBe('[redacted]');
  });

  it('redacts non-string input', () => {
    expect(maskEmail(42)).toBe('[redacted]');
  });

  it('redacts an address without an at sign', () => {
    expect(maskEmail('invalid')).toBe('[redacted]');
  });

  it('redacts an address without a local part', () => {
    expect(maskEmail('@example.com')).toBe('[redacted]');
  });

  it('redacts an address without a domain', () => {
    expect(maskEmail('user@')).toBe('[redacted]');
  });
});

describe('maskIp', () => {
  it('masks the final IPv4 octet', () => {
    expect(maskIp('203.0.113.77')).toBe('203.0.113.0');
  });

  it('masks IPv6 after the first three hextets', () => {
    expect(maskIp('2001:db8:85a3:8d3:1319:8a2e:370:7348')).toBe('2001:db8:85a3::');
  });

  it('masks IPv4-mapped IPv6 as IPv4', () => {
    expect(maskIp('::ffff:203.0.113.77')).toBe('203.0.113.0');
  });

  it('redacts unknown input', () => {
    expect(maskIp('unknown')).toBe('[redacted]');
  });

  it('redacts empty input', () => {
    expect(maskIp('')).toBe('[redacted]');
  });

  it('redacts unparseable input', () => {
    expect(maskIp('203.0.113.invalid')).toBe('[redacted]');
  });

  it('redacts non-string input', () => {
    expect(maskIp(null)).toBe('[redacted]');
  });
});
