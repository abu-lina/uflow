import { describe, expect, it } from 'vitest';
import { generateLocalizedMetadata } from '../metadataUtils';

const SITE_URL = 'https://ummahflow.com';

// AC: meta description does not contain "Marktplatz"
describe('AC1: description does not contain Marktplatz', () => {
  const locales = ['de', 'en', 'ar', 'tr', 'ur', 'ps'] as const;

  it.each(locales)('description for locale %s contains no "Marktplatz"', (lang) => {
    const meta = generateLocalizedMetadata(lang, SITE_URL);
    expect(meta.description).not.toMatch(/Marktplatz/i);
  });

  it.each(locales)('og:description for locale %s contains no "Marktplatz"', (lang) => {
    const meta = generateLocalizedMetadata(lang, SITE_URL);
    const ogDesc = (meta.openGraph as Record<string, unknown>)?.description as string;
    expect(ogDesc).not.toMatch(/Marktplatz/i);
  });

  it.each(locales)('twitter description for locale %s contains no "Marktplatz"', (lang) => {
    const meta = generateLocalizedMetadata(lang, SITE_URL);
    const twitterDesc = (meta.twitter as Record<string, unknown>)?.description as string;
    expect(twitterDesc).not.toMatch(/Marktplatz/i);
  });
});

// AC: keywords array does not contain "marktplatz"
describe('AC2: keywords array does not contain marktplatz', () => {
  it('keywords contain no "marktplatz"', () => {
    const meta = generateLocalizedMetadata('de', SITE_URL);
    const keywords = meta.keywords as string[];
    expect(keywords).not.toContain('marktplatz');
  });
});

// AC: German description matches the confirmed copy
describe('AC3: German description matches confirmed copy', () => {
  it('de description is the confirmed replacement text', () => {
    const meta = generateLocalizedMetadata('de', SITE_URL);
    expect(meta.description).toBe(
      'Halal essen in deiner Stadt. Ummah Flow zeigt dir geprüfte Restaurants — transparent und mit Barakah.',
    );
  });
});
