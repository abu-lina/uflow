/**
 * #698: auth pages must only follow a returnUrl that stays on our origin.
 */
import { describe, expect, it } from 'vitest';
import { getSafeReturnUrl } from '@/utils/safeReturnUrl';

const FALLBACK = '/profile';

describe('#698 AC1: returns returnUrl only if, after decoding, it is a same-origin path', () => {
  it('returns the decoded path when it starts with a single /', () => {
    expect(getSafeReturnUrl('%2Fcreate%2Frecommend', FALLBACK)).toBe('/create/recommend');
  });

  it('returns the fallback when the path starts with //', () => {
    expect(getSafeReturnUrl('//evil.example/path', FALLBACK)).toBe(FALLBACK);
  });

  it('returns the fallback when the path starts with /\\', () => {
    expect(getSafeReturnUrl('/\\evil.example/path', FALLBACK)).toBe(FALLBACK);
  });

  it('returns the fallback when a tab or newline turns the path into //', () => {
    expect(getSafeReturnUrl('/%09/evil.example', FALLBACK)).toBe(FALLBACK);
    expect(getSafeReturnUrl('/%0A/evil.example', FALLBACK)).toBe(FALLBACK);
  });

  it.each(['/%0A//evil.example', '/%0D//evil.example', '/%09//evil.example', '/%0A/%0A/evil.example'])(
    'returns the fallback when stripped whitespace leaves extra slashes: %j',
    raw => {
      expect(getSafeReturnUrl(raw, FALLBACK)).toBe(FALLBACK);
    }
  );

  it('returns the value the URL parser checked, not the raw decoded input', () => {
    expect(getSafeReturnUrl('/create%09/recommend', FALLBACK)).toBe('/create/recommend');
    expect(getSafeReturnUrl('/create/%0D%0Arecommend', FALLBACK)).toBe('/create/recommend');
    expect(getSafeReturnUrl('/create/../profile', FALLBACK)).toBe('/profile');
  });

  it('returns the fallback when the value has a scheme', () => {
    expect(getSafeReturnUrl('mailto:someone@evil.example', FALLBACK)).toBe(FALLBACK);
  });

  it('returns the fallback when the value does not start with /', () => {
    expect(getSafeReturnUrl('evil.example', FALLBACK)).toBe(FALLBACK);
  });

  it('returns the fallback for a missing value', () => {
    expect(getSafeReturnUrl(null, FALLBACK)).toBe(FALLBACK);
    expect(getSafeReturnUrl(undefined, FALLBACK)).toBe(FALLBACK);
  });

  it('returns the fallback when the value cannot be decoded', () => {
    expect(getSafeReturnUrl('/%E0%A4%A', FALLBACK)).toBe(FALLBACK);
  });

  it("returns the caller's fallback, whatever it is", () => {
    expect(getSafeReturnUrl('//evil.example', null)).toBeNull();
    expect(getSafeReturnUrl('//evil.example', '/food')).toBe('/food');
  });
});

describe('#698 AC2: rejects the listed attacks and accepts the listed paths', () => {
  it.each([
    '//evil.example',
    '/\\evil.example',
    'https://evil.example',
    'javascript:alert(1)',
    '%2F%2Fevil.example',
    '',
  ])('rejects %j', raw => {
    expect(getSafeReturnUrl(raw, FALLBACK)).toBe(FALLBACK);
  });

  it.each(['/create/recommend', '/profile?tab=saved', '/p/123#reviews'])('accepts %j', raw => {
    expect(getSafeReturnUrl(raw, FALLBACK)).toBe(raw);
  });
});
