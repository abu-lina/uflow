/**
 * Page function for apify/web-scraper that extracts one Lieferando menu.
 *
 * It runs inside the scraped page (Chrome), so it is kept as a plain-JS string
 * and cannot import anything. The DOM extraction mirrors the former Playwright
 * client (lieferando-client.ts getRestaurantPage): menu categories with a
 * heading, and the items inside each with name, description and price.
 *
 * Returns { url, menuCategories: [{ name, items: [{ name, description, priceCents }] }] }.
 * A page without a menu (block page, unknown slug) returns an empty menuCategories.
 */
export const LIEFERANDO_PAGE_FUNCTION = String.raw`async function pageFunction(context) {
  try {
    await context.waitFor('[class*="menu-item"], [class*="gericht"]', { timeoutSecs: 15 });
  } catch (e) {
    // no menu rendered; fall through and return what is there
  }

  const text = (root, selector) => {
    const el = root.querySelector(selector);
    return el && el.textContent ? el.textContent.trim() : '';
  };

  const toCents = (priceText) => {
    const parsed = parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.'));
    return isNaN(parsed) ? null : Math.round(parsed * 100);
  };

  const menuCategories = [];
  const categoryEls = Array.prototype.slice.call(
    document.querySelectorAll(
      '[class*="category"], [class*="menu-category"], [class*="gericht-gruppe"], section'
    )
  );

  categoryEls.forEach((cat) => {
    const header = cat.querySelector('h2, h3, [class*="category-name"], [class*="category-title"]');
    if (!header) return;
    const name = (header.textContent || '').trim() || 'Sonstige';

    const items = [];
    const itemEls = Array.prototype.slice.call(
      cat.querySelectorAll('[class*="menu-item"], [class*="gericht"]')
    );
    itemEls.forEach((item) => {
      const itemName =
        text(item, '[class*="item-name"], [class*="gericht-name"], h4') ||
        (item.childNodes[0] && item.childNodes[0].textContent
          ? item.childNodes[0].textContent.trim()
          : '');
      if (!itemName) return;

      items.push({
        name: itemName,
        description:
          text(item, '[class*="item-description"], [class*="gericht-beschreibung"], p') || null,
        priceCents: toCents(text(item, '[class*="item-price"], [class*="gericht-preis"], [class*="price"]')),
      });
    });

    if (items.length > 0) menuCategories.push({ name, items });
  });

  return { url: context.request.url, menuCategories };
}`;
