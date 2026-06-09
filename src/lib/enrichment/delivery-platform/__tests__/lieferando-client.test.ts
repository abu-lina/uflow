import { describe, expect, it } from 'vitest';
import {
  parsePriceCents,
  extractJsonLd,
  parseMenuCategories,
  parseRestaurantCards,
} from '../lieferando-client';
import * as cheerio from 'cheerio';

describe('parsePriceCents', () => {
  it('parses "10,50 €" to 1050', () => {
    expect(parsePriceCents('10,50 €')).toBe(1050);
  });

  it('parses "5,00 €" to 500', () => {
    expect(parsePriceCents('5,00 €')).toBe(500);
  });

  it('handles integer prices', () => {
    expect(parsePriceCents('12 €')).toBe(1200);
  });

  it('returns 0 for unparseable input', () => {
    expect(parsePriceCents('kostenlos')).toBe(0);
  });

  it('parses "0,00 €" to 0', () => {
    expect(parsePriceCents('0,00 €')).toBe(0);
  });
});

describe('extractJsonLd', () => {
  it('extracts Restaurant JSON-LD from HTML', () => {
    const html = `
      <html>
      <head>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Restaurant",
            "name": "Test Restaurant",
            "telephone": "+49 30 123456",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "Teststr. 1, 10115 Berlin"
            }
          }
        </script>
      </head>
      <body></body>
      </html>
    `;
    const $ = cheerio.load(html);
    const result = extractJsonLd($);
    expect(result).not.toBeNull();
    expect((result as Record<string, unknown>)?.name).toBe('Test Restaurant');
    expect((result as Record<string, unknown>)?.telephone).toBe('+49 30 123456');
  });

  it('returns null when no Restaurant JSON-LD exists', () => {
    const html = `<html><head></head><body></body></html>`;
    const $ = cheerio.load(html);
    const result = extractJsonLd($);
    expect(result).toBeNull();
  });

  it('skips non-Restaurant JSON-LD types', () => {
    const html = `
      <html>
      <head>
        <script type="application/ld+json">
          { "@type": "WebSite", "name": "Test" }
        </script>
      </head>
      <body></body>
      </html>
    `;
    const $ = cheerio.load(html);
    const result = extractJsonLd($);
    expect(result).toBeNull();
  });

  it('handles malformed JSON gracefully', () => {
    const html = `
      <html>
      <head>
        <script type="application/ld+json">
          { invalid json here }
        </script>
      </head>
      <body></body>
      </html>
    `;
    const $ = cheerio.load(html);
    const result = extractJsonLd($);
    expect(result).toBeNull();
  });
});

describe('parseMenuCategories', () => {
  it('parses menu items from HTML', () => {
    const html = `
      <html><body>
        <section>
          <h2>Vorspeisen</h2>
          <div class="menu-item">
            <span class="item-name">Bruschetta</span>
            <p class="item-description">Classic Italian</p>
            <span class="item-price">8,50 €</span>
          </div>
          <div class="menu-item">
            <span class="item-name">Insalata</span>
            <span class="item-price">7,00 €</span>
          </div>
        </section>
        <section>
          <h2>Hauptgerichte</h2>
          <div class="menu-item">
            <span class="item-name">Pizza Margherita</span>
            <p class="item-description">Tomato, mozzarella</p>
            <span class="item-price">12,00 €</span>
          </div>
        </section>
      </body></html>
    `;
    const $ = cheerio.load(html);
    const categories = parseMenuCategories($);

    expect(categories).toHaveLength(2);
    expect(categories[0].name).toBe('Vorspeisen');
    expect(categories[0].items).toHaveLength(2);
    expect(categories[0].items[0].name).toBe('Bruschetta');
    expect(categories[0].items[0].description).toBe('Classic Italian');
    expect(categories[0].items[0].priceCents).toBe(850);
    expect(categories[0].items[1].priceCents).toBe(700);

    expect(categories[1].name).toBe('Hauptgerichte');
    expect(categories[1].items).toHaveLength(1);
    expect(categories[1].items[0].name).toBe('Pizza Margherita');
    expect(categories[1].items[0].priceCents).toBe(1200);
  });

  it('returns empty array when no categories found', () => {
    const html = `<html><body><p>No menu here</p></body></html>`;
    const $ = cheerio.load(html);
    const categories = parseMenuCategories($);
    expect(categories).toEqual([]);
  });

  it('handles items without description', () => {
    const html = `
      <html><body>
        <section>
          <h2>Getränke</h2>
          <div class="menu-item">
            <span class="item-name">Wasser</span>
            <span class="item-price">2,50 €</span>
          </div>
        </section>
      </body></html>
    `;
    const $ = cheerio.load(html);
    const categories = parseMenuCategories($);
    expect(categories[0].items[0].description).toBeNull();
  });
});

describe('parseRestaurantCards', () => {
  it('extracts restaurant links from city page HTML', () => {
    const html = `
      <html><body>
        <a href="/speisekarte/doner-haus-123">Döner Haus</a>
        <a href="/speisekarte/pizza-platz-456">Pizza Platz</a>
        <a href="/speisekarte/asia-imbiss-789">Asia Imbiss</a>
      </body></html>
    `;
    const $ = cheerio.load(html);
    const results = parseRestaurantCards($, 'Berlin');

    expect(results).toHaveLength(3);
    expect(results[0].name).toBe('Döner Haus');
    expect(results[0].slug).toBe('doner-haus-123');
    expect(results[0].city).toBe('Berlin');
    expect(results[0].isActive).toBe(true);
  });

  it('deduplicates restaurants by slug', () => {
    const html = `
      <html><body>
        <a href="/speisekarte/doner-haus-123">Döner Haus</a>
        <a href="/speisekarte/doner-haus-123">Döner Haus (duplicate)</a>
      </body></html>
    `;
    const $ = cheerio.load(html);
    const results = parseRestaurantCards($, 'Berlin');
    expect(results).toHaveLength(1);
  });

  it('returns empty array when no restaurant links found', () => {
    const html = `<html><body><p>Nothing here</p></body></html>`;
    const $ = cheerio.load(html);
    const results = parseRestaurantCards($, 'Berlin');
    expect(results).toEqual([]);
  });
});
