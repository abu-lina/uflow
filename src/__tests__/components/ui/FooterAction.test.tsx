// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FooterAction } from '@/components/ui/FooterAction';

// jsdom has no layout, so the measurement seam is getBoundingClientRect on
// the footer element — distinguished per instance by a marker class.
function stubMeasurement() {
  return vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const h = this.classList?.contains('footer-a')
      ? 100
      : this.classList?.contains('footer-b')
        ? 200
        : 0;
    return {
      height: h,
      width: 0,
      top: 0,
      bottom: h,
      left: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
  });
}

function stubResizeObserver() {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      private cb: ResizeObserverCallback;
      constructor(cb: ResizeObserverCallback) {
        this.cb = cb;
      }
      observe(_el: Element) {
        this.cb([] as unknown as ResizeObserverEntry[], this as unknown as ResizeObserver);
      }
      unobserve() {}
      disconnect() {}
    },
  );
}

const published = () => document.documentElement.style.getPropertyValue('--footer-action-height');

describe('FooterAction --footer-action-height publishing (#562)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.documentElement.style.removeProperty('--footer-action-height');
  });

  it('unmounting one topRow consumer must not delete a live value owned by another (CR3)', () => {
    // FooterAction writes --footer-action-height on documentElement. An
    // unconditional removeProperty on cleanup meant the first consumer to
    // unmount deleted the measurement a still-mounted consumer depends on.
    stubMeasurement();
    stubResizeObserver();

    const a = render(
      <FooterAction
        actionButton={{ label: 'Save A', onClick: vi.fn() }}
        className="footer-a"
        topRow={<div>review row</div>}
      />,
    );
    expect(published()).toBe('100px');

    const b = render(
      <FooterAction
        actionButton={{ label: 'Save B', onClick: vi.fn() }}
        className="footer-b"
        topRow={<div>review row</div>}
      />,
    );
    expect(published()).toBe('200px');

    // B unmounts while A is still mounted: the property must survive and
    // reflect A's live measurement, not vanish or keep B's stale 200px.
    b.unmount();
    expect(published()).toBe('100px');

    // With no consumer left, the property is removed entirely.
    a.unmount();
    expect(published()).toBe('');
  });
});
