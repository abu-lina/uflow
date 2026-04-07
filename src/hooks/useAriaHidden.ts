'use client';

import { RefObject, useEffect } from 'react';

export function useAriaHidden(
  containerRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
): void {
  useEffect(() => {
    if (!isOpen) return;

    const container = containerRef.current;
    const siblings = Array.from(document.body.children) as HTMLElement[];
    const previousValues = new Map<HTMLElement, string | null>();

    for (const sibling of siblings) {
      if (sibling === container) continue;
      if (sibling.tagName === 'SCRIPT') continue;
      previousValues.set(sibling, sibling.getAttribute('aria-hidden'));
      sibling.setAttribute('aria-hidden', 'true');
    }

    return () => {
      previousValues.forEach((previous, sibling) => {
        if (previous === null) {
          sibling.removeAttribute('aria-hidden');
        } else {
          sibling.setAttribute('aria-hidden', previous);
        }
      });
    };
  }, [isOpen, containerRef]);
}
