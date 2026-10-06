import type { IconifyIcon } from '@iconify/react';

/**
 * Bundled glyph data for icons that must never depend on the Iconify API.
 *
 * `<Icon icon="mdi:check" />` with a string name renders an empty span and
 * fetches the glyph from api.iconify.design at runtime: first paint has no
 * icon, the label shifts when the fetch lands, and offline the icon never
 * appears (#548 evidence rework, item 3 — two captures of the same review
 * bar disagreed). Passing the IconifyIcon object renders the svg in the
 * first mounted render with no network call.
 *
 * Body data verified against https://api.iconify.design/mdi.json?icons=check,close
 * Asserted in src/__tests__/lib/mdi-icons.test.tsx.
 */
export const mdiCheck: IconifyIcon = {
  body: '<path fill="currentColor" d="M21 7L9 19l-5.5-5.5l1.41-1.41L9 16.17L19.59 5.59z"/>',
  width: 24,
  height: 24,
};

export const mdiClose: IconifyIcon = {
  body: '<path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/>',
  width: 24,
  height: 24,
};
