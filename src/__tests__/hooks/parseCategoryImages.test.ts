import { describe, it, expect } from 'vitest';
import { parseCategoryImages } from '@/hooks/useImageFallback';

describe('parseCategoryImages — regression coverage [Plan 055]', () => {
  describe('NULL/undefined/empty inputs (safe fallthrough to placeholder)', () => {
    it('returns empty array for null', () => {
      expect(parseCategoryImages(null)).toEqual([]);
    });

    it('returns empty array for undefined', () => {
      expect(parseCategoryImages(undefined)).toEqual([]);
    });

    it('returns empty array for empty string', () => {
      // JSON.parse('') throws — should be caught and return []
      expect(parseCategoryImages('')).toEqual([]);
    });
  });

  describe('valid JSONB structures (production data formats)', () => {
    it('parses {urls: [...]} object (production format)', () => {
      const input = {
        urls: [
          'https://rdtdtcfntopcxcigkqoq.supabase.co/storage/v1/object/public/category-images/sports.jpg',
        ],
      };
      expect(parseCategoryImages(input)).toEqual([
        'https://rdtdtcfntopcxcigkqoq.supabase.co/storage/v1/object/public/category-images/sports.jpg',
      ]);
    });

    it('parses JSON string with {urls: [...]} format', () => {
      const input = JSON.stringify({
        urls: [
          'https://rdtdtcfntopcxcigkqoq.supabase.co/storage/v1/object/public/category-images/community_services.jpg',
        ],
      });
      expect(parseCategoryImages(input)).toEqual([
        'https://rdtdtcfntopcxcigkqoq.supabase.co/storage/v1/object/public/category-images/community_services.jpg',
      ]);
    });

    it('parses plain array of URLs', () => {
      const input = ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'];
      expect(parseCategoryImages(input as unknown as Record<string, unknown>)).toEqual([
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
      ]);
    });

    it('parses {url: "..."} single-URL format', () => {
      const input = { url: 'https://example.com/single.jpg' };
      expect(parseCategoryImages(input)).toEqual(['https://example.com/single.jpg']);
    });
  });

  describe('broken URL handling — the exact bug path', () => {
    it('returns the broken URL from valid JSONB — downstream must handle the 400', () => {
      // This is the exact production scenario from Analysis 055:
      // category_images JSONB points to a non-existent file
      const input = {
        urls: [
          'https://rdtdtcfntopcxcigkqoq.supabase.co/storage/v1/object/public/category-images/a65-design-2NLeXS3NR5E-unsplash.jpg',
        ],
      };
      const result = parseCategoryImages(input);

      // parseCategoryImages correctly extracts the URL — it cannot validate HTTP reachability
      // The defense-in-depth fix is the onError handler in UnifiedGallery
      expect(result).toEqual([
        'https://rdtdtcfntopcxcigkqoq.supabase.co/storage/v1/object/public/category-images/a65-design-2NLeXS3NR5E-unsplash.jpg',
      ]);
    });

    it('[post-fix PASSES] clothing.jpg replacement URL is parsed from production JSONB', () => {
      // After the corrected data fix: Clothing & Fashion points to clothing.jpg,
      // a confirmed live asset in the same public bucket.
      const input = {
        urls: [
          'https://rdtdtcfntopcxcigkqoq.supabase.co/storage/v1/object/public/category-images/clothing.jpg',
        ],
      };
      expect(parseCategoryImages(input)).toEqual([
        'https://rdtdtcfntopcxcigkqoq.supabase.co/storage/v1/object/public/category-images/clothing.jpg',
      ]);
    });
  });

  describe('malformed inputs (graceful degradation)', () => {
    it('returns empty array for invalid JSON string', () => {
      expect(parseCategoryImages('not-valid-json')).toEqual([]);
    });

    it('returns empty array for object without urls/url keys', () => {
      const input = { something: 'else' };
      expect(parseCategoryImages(input)).toEqual([]);
    });
  });
});
