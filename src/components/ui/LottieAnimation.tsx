'use client';

import Lottie from 'lottie-react';
import { useMemo } from 'react';

interface LottieAnimationProps {
  animationData: object;
  className?: string;
  height?: number | string;
  width?: number | string;
  loop?: boolean;
  autoplay?: boolean;
}

export function LottieAnimation({
  animationData,
  className = '',
  height,
  width,
  loop = true,
  autoplay = true,
}: LottieAnimationProps) {
  const style = useMemo(() => {
    const styles: React.CSSProperties = {};
    if (height) styles.height = typeof height === 'number' ? `${height}px` : height;
    if (width) styles.width = typeof width === 'number' ? `${width}px` : width;
    return styles;
  }, [height, width]);

  return (
    <div className={className} style={style}>
      <Lottie
        animationData={animationData}
        autoplay={autoplay}
        loop={loop}
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  );
}

