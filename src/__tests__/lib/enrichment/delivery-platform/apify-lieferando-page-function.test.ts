// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import { LIEFERANDO_PAGE_FUNCTION } from '@/lib/enrichment/delivery-platform/apify-lieferando-page-function';

type PageResult = { url: string; menuCategories: unknown[] };

async function runPageFunction(html: string): Promise<PageResult> {
  document.body.innerHTML = html;
  const pageFunction = new Function(`return (${LIEFERANDO_PAGE_FUNCTION})`)() as (
    ctx: unknown,
  ) => Promise<PageResult>;
  return pageFunction({
    request: { url: 'https://www.lieferando.de/speisekarte/x' },
    waitFor: async () => {},
  });
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('Lieferando page function (runs in the scraped page)', () => {
  it('extracts categories with item names, descriptions and prices from the DOM', async () => {
    const result = await runPageFunction(`
      <section class="menu-category">
        <h2>Pizza</h2>
        <div class="menu-item">
          <span class="item-name">Margherita</span>
          <p class="item-description">Tomate, Käse</p>
          <span class="item-price">8,50 €</span>
        </div>
        <div class="menu-item">
          <span class="item-name">Salami</span>
          <span class="item-price">9,90 €</span>
        </div>
        <div class="menu-item">
          <span class="item-name">Wasser</span>
        </div>
        <div class="menu-item">
          <span class="item-name">Brot</span>
          <span class="item-price">0,00 €</span>
        </div>
      </section>
      <section class="menu-category"><h2>Empty</h2></section>`);

    expect(result.url).toBe('https://www.lieferando.de/speisekarte/x');
    expect(result.menuCategories).toEqual([
      {
        name: 'Pizza',
        items: [
          { name: 'Margherita', description: 'Tomate, Käse', priceCents: 850 },
          { name: 'Salami', description: null, priceCents: 990 },
          { name: 'Wasser', description: null, priceCents: null },
          { name: 'Brot', description: null, priceCents: 0 },
        ],
      },
    ]);
  });

  it('returns no categories for a page without a menu (for example a block page)', async () => {
    const result = await runPageFunction('<h1>Access denied</h1>');
    expect(result.menuCategories).toEqual([]);
  });
});
