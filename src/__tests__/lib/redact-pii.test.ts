import { describe, expect, it } from 'vitest';
import {
  maskEmail,
  maskIdentifier,
  maskIp,
  redactEmails,
  redactError,
} from '@/lib/logging/redact-pii';

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

  it('redacts an address without a qualified domain', () => {
    expect(maskEmail('user@example')).toBe('[redacted]');
  });

  it('redacts an address with multiple at signs', () => {
    expect(maskEmail('user@@example.com')).toBe('[redacted]');
  });

  it('redacts malformed local parts', () => {
    expect(maskEmail('user..name@example.com')).toBe('[redacted]');
  });
});

describe('maskIp', () => {
  it('masks the final IPv4 octet', () => {
    expect(maskIp('203.0.113.77')).toBe('203.0.113.0');
  });

  it('masks IPv6 after the first three hextets', () => {
    expect(maskIp('2001:db8:85a3:8d3:1319:8a2e:370:7348')).toBe('2001:db8:85a3::');
  });

  it('masks compressed IPv6 after the first three hextets', () => {
    expect(maskIp('2001:db8:85a3::1')).toBe('2001:db8:85a3::');
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

describe('maskIdentifier', () => {
  it('masks the IP inside an ip: identifier', () => {
    expect(maskIdentifier('ip:203.0.113.77')).toBe('ip:203.0.113.0');
  });

  it('keeps a user: identifier', () => {
    expect(maskIdentifier('user:abc-123')).toBe('user:abc-123');
  });

  it('redacts anything else', () => {
    expect(maskIdentifier('203.0.113.77')).toBe('[redacted]');
    expect(maskIdentifier(undefined)).toBe('[redacted]');
  });
});

describe('redactEmails', () => {
  it('masks every email embedded in text', () => {
    expect(redactEmails('a pii-probe@example.test and (other@example.org).')).toBe(
      'a p***@example.test and (o***@example.org).',
    );
  });

  it('leaves text without emails unchanged', () => {
    expect(redactEmails('no address here')).toBe('no address here');
  });
});

describe('redactError', () => {
  it('keeps diagnostic fields and masks emails in their text', () => {
    const error = Object.assign(new Error('failed for pii-probe@example.test'), {
      code: '23505',
      details: 'Key (email)=(pii-probe@example.test)',
    });

    expect(redactError(error)).toEqual({
      name: 'Error',
      message: 'failed for p***@example.test',
      code: '23505',
      details: 'Key (email)=(p***@example.test)',
    });
  });

  it('handles plain error objects and strings', () => {
    expect(redactError({ message: 'to pii-probe@example.test', status: 400 })).toEqual({
      message: 'to p***@example.test',
      status: 400,
    });
    expect(redactError('send to pii-probe@example.test failed')).toEqual({
      message: 'send to p***@example.test failed',
    });
  });
});
