'use client';

import { useEffect, useState } from 'react';
import { LottieAnimation } from './LottieAnimation';

interface MapsLottieProps {
  className?: string;
  height?: number | string;
}

export function MapsLottie({ className = '', height }: MapsLottieProps) {
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAnimation = async () => {
      try {
        const response = await fetch('/animations/maps.json');
        const data = await response.json();
        setAnimationData(data);
      } catch (error) {
        console.error('Failed to load Lottie animation:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnimation();
  }, []);

  if (isLoading || !animationData) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={height ? { height: typeof height === 'number' ? `${height}px` : height } : undefined}
      >
        <div className="h-12 w-12 animate-pulse rounded-full bg-neutral-200" />
      </div>
    );
  }

  return (
    <LottieAnimation
      animationData={animationData}
      autoplay={true}
      className={className}
      height={height}
      loop={false}
    />
  );
}
