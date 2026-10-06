// @vitest-environment jsdom
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';

// Undo the global iconify mock from setup.ts — this test exercises the real
// component to prove the bundled glyph data renders with no network call.
vi.unmock('@iconify/react');

import { Icon } from '@iconify/react';

import { mdiCheck, mdiClose } from '@/lib/icons';

/**
 * #548 evidence rework, item 3: the review buttons passed 'mdi:check' /
 * 'mdi:close' as string names, so @iconify/react rendered an empty span and
 * fetched the glyph from api.iconify.design — two captures of the same bar
 * disagreed (icons vs none) and the label shifted when the icon landed.
 * Passing IconifyIcon objects renders the svg without touching the API.
 */
describe('bundled mdi icons (#548 evidence rework)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders svgs with fetch made unreachable — no Iconify API dependency', async () => {
    const fetchStub = vi.fn().mockRejectedValue(new Error('network is off'));
    vi.stubGlobal('fetch', fetchStub);

    render(
      <>
        <Icon height={16} icon={mdiCheck} width={16} />
        <Icon height={16} icon={mdiClose} width={16} />
      </>,
    );

    await waitFor(() => {
      expect(document.querySelectorAll('svg').length).toBe(2);
    });
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it('carries the real mdi check/close glyphs (verified against api.iconify.design)', () => {
    // Expected fragments come from the live Iconify response for
    // mdi.json?icons=check,close — an independent source, not the code.
    expect(mdiCheck.body).toContain('M21 7L9 19');
    expect(mdiClose.body).toContain('M19 6.41L17.59 5L12 10.59');
    expect(mdiCheck.width).toBe(24);
    expect(mdiClose.width).toBe(24);
  });
});
