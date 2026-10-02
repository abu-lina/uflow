import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/roles', () => ({
  isAdminOrModerator: vi.fn(async () => false),
}));

import { getRateLimitKey } from '@/middleware';

describe('Request 279 — middleware rate-limit key trusts x-real-ip over spoofed XFF', () => {
  it('[regression] a spoofed x-forwarded-for cannot move the rate-limit bucket when x-real-ip is set', () => {
    const spoofed = new NextRequest('http://localhost/api/test', {
      headers: {
        'x-real-ip': '203.0.113.10',
        'x-forwarded-for': '6.6.6.6',
      },
    });
    const unsupplied = new NextRequest('http://localhost/api/test', {
      headers: { 'x-real-ip': '203.0.113.10' },
    });

    expect(getRateLimitKey(spoofed)).toBe('203.0.113.10');
    expect(getRateLimitKey(spoofed)).toBe(getRateLimitKey(unsupplied));
  });

  it('[regression] without nginx (no x-real-ip) the appended hop is used, keeping per-client buckets', () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '1.1.1.1, 203.0.113.10' },
    });
    expect(getRateLimitKey(req)).toBe('203.0.113.10');
  });
});
