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

// #562: the remaining string-name sites on the same surfaces — the
// ProviderCard halal stars and the halal page's certificate-file glyph.
// Body data verified against
// https://api.iconify.design/mdi.json?icons=star,file-document-outline
export const mdiStar: IconifyIcon = {
  body: '<path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2L9.19 8.62L2 9.24l5.45 4.73L5.82 21z"/>',
  width: 24,
  height: 24,
};

export const mdiFileDocumentOutline: IconifyIcon = {
  body: '<path fill="currentColor" d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm0 2h7v5h5v11H6zm2 8v2h8v-2zm0 4v2h5v-2z"/>',
  width: 24,
  height: 24,
};

// #562: the footer's own save/close glyphs sat on the same bar as the
// bundled approve/reject icons and still raced the Iconify API.
// Body data verified against
// https://api.iconify.design/material-symbols.json?icons=save-outline,close
export const materialSymbolsSaveOutline: IconifyIcon = {
  body: '<path fill="currentColor" d="M21 7v12q0 .825-.587 1.413T19 21H5q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h12zm-2 .85L16.15 5H5v14h14zm-4.875 9.275Q15 16.25 15 15t-.875-2.125T12 12t-2.125.875T9 15t.875 2.125T12 18t2.125-.875M6 10h9V6H6zM5 7.85V19V5z"/>',
  width: 24,
  height: 24,
};

export const materialSymbolsClose: IconifyIcon = {
  body: '<path fill="currentColor" d="M6.4 19L5 17.6l5.6-5.6L5 6.4L6.4 5l5.6 5.6L17.6 5L19 6.4L13.4 12l5.6 5.6l-1.4 1.4l-5.6-5.6z"/>',
  width: 24,
  height: 24,
};
