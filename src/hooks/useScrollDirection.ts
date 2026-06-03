'use client';

import { useEffect, useState } from 'react';

export function useScrollDirection() {
  const [isVisible, setIsVisible] = useState(true);
  useEffect(() => {
    let lastScrollY = 0;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const threshold = 64; // px before header can hide

      if (currentScrollY < threshold) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up
        setIsVisible(true);
      }
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return { isVisible };
}
