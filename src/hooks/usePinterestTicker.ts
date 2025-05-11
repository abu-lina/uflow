import { useEffect, useState } from 'react';

interface UsePinterestTickerProps {
  numCards: number;
  cardWidth: number;
  cardGap: number;
  animationSpeed: number;
}

export const usePinterestTicker = ({
  numCards,
  cardWidth,
  cardGap,
  animationSpeed,
}: UsePinterestTickerProps) => {
  const [scrollPx, setScrollPx] = useState(0);
  const ITEM_WIDTH = cardWidth + cardGap;
  const TOTAL_WIDTH = numCards * ITEM_WIDTH;

  useEffect(() => {
    let animationFrameId: number;
    let px = 0;

    const animate = () => {
      px += animationSpeed;

      // When we've scrolled past the width of all original cards, reset to beginning
      // but keep the fractional part to ensure smooth animation
      if (px >= TOTAL_WIDTH) {
        px = px % TOTAL_WIDTH;
      }

      setScrollPx(px);
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [TOTAL_WIDTH, animationSpeed]);

  return { scrollPx };
};
