import { describe, it, expect } from 'vitest';
import { getFirstImageUrl, getAllTrustedImageUrls, PLACEHOLDER_IMAGE } from '@/utils/imageUtils';
import type { ProviderImages } from '@/utils/imageUtils';

describe('getFirstImageUrl', () => {
  it('returns PLACEHOLDER_IMAGE for null input', () => {
    expect(getFirstImageUrl(null)).toBe(PLACEHOLDER_IMAGE);
  });

  it('returns PLACEHOLDER_IMAGE for undefined input', () => {
    expect(getFirstImageUrl(undefined)).toBe(PLACEHOLDER_IMAGE);
  });

  it('returns PLACEHOLDER_IMAGE for empty string input', () => {
    expect(getFirstImageUrl('')).toBe(PLACEHOLDER_IMAGE);
  });

  it('returns PLACEHOLDER_IMAGE for "null" string input', () => {
    expect(getFirstImageUrl('null')).toBe(PLACEHOLDER_IMAGE);
  });

  it('parses valid JSON string and returns first URL', () => {
    const input = '{"urls":["a.jpg","b.jpg"]}';
    expect(getFirstImageUrl(input)).toBe('a.jpg');
  });

  it('uses array as urls directly', () => {
    const input: ProviderImages = ['a.jpg'];
    expect(getFirstImageUrl(input)).toBe('a.jpg');
  });

  it('extracts first url from object with urls array', () => {
    const input: ProviderImages = { urls: ['a.jpg'] };
    expect(getFirstImageUrl(input)).toBe('a.jpg');
  });

  it('returns PLACEHOLDER_IMAGE when urls array is empty', () => {
    const input: ProviderImages = { urls: [] };
    expect(getFirstImageUrl(input)).toBe(PLACEHOLDER_IMAGE);
  });

  it('returns PLACEHOLDER_IMAGE for invalid JSON string', () => {
    expect(getFirstImageUrl('invalid json')).toBe(PLACEHOLDER_IMAGE);
  });
});

describe('getAllTrustedImageUrls', () => {
  it('returns empty array for null input', () => {
    expect(getAllTrustedImageUrls(null)).toEqual([]);
  });

  it('returns empty array for undefined input', () => {
    expect(getAllTrustedImageUrls(undefined)).toEqual([]);
  });

  it('returns empty array for empty string input', () => {
    expect(getAllTrustedImageUrls('')).toEqual([]);
  });

  it('returns empty array for "null" string input', () => {
    expect(getAllTrustedImageUrls('null')).toEqual([]);
  });

  it('parses valid JSON string and returns urls', () => {
    const input = '{"urls":["a.jpg","b.jpg"]}';
    expect(getAllTrustedImageUrls(input)).toEqual(['a.jpg', 'b.jpg']);
  });

  it('uses array directly', () => {
    const input: ProviderImages = ['a.jpg'];
    expect(getAllTrustedImageUrls(input)).toEqual(['a.jpg']);
  });

  it('extracts urls from object with urls array', () => {
    const input: ProviderImages = { urls: ['a.jpg'] };
    expect(getAllTrustedImageUrls(input)).toEqual(['a.jpg']);
  });

  it('returns empty array when urls array is empty', () => {
    const input: ProviderImages = { urls: [] };
    expect(getAllTrustedImageUrls(input)).toEqual([]);
  });

  it('returns empty array for invalid JSON string', () => {
    expect(getAllTrustedImageUrls('invalid json')).toEqual([]);
  });
});
