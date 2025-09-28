'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { MobileHeader } from '@/components/layout/MobileHeader';
import { MobileNavbar } from '@/components/layout/MobileNavbar';
import { AboutCard } from '@/components/shared/AboutCard';
import { quotes } from '@/constants/quotes';

interface AboutPageContentProps {
  onComplete?: () => void;
  showSplashHeader?: boolean;
}

export function AboutPageContent({ onComplete, showSplashHeader = false }: AboutPageContentProps) {
  const router = useRouter();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentCardIndex < quotes.length - 1) {
      setIsTransitioning(true);
      setCurrentCardIndex(currentCardIndex + 1);
    }
    if (isRightSwipe && currentCardIndex > 0) {
      setIsTransitioning(true);
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };

  const changeCard = (newIndex: number) => {
    if (newIndex !== currentCardIndex && newIndex >= 0 && newIndex < quotes.length) {
      setIsTransitioning(true);
      setCurrentCardIndex(newIndex);
    }
  };

  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 300); // Match transition duration
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

  return (
    <div className="min-h-screen-fix flex flex-col">
      {/* HEADER SECTION - Fixed at top */}
      <MobileHeader 
        title={showSplashHeader ? undefined : 'Über Uns'}
        variant={showSplashHeader ? 'splash' : 'about'}
        onBack={showSplashHeader ? undefined : () => router.back()}
      />

      {/* CONTENT SECTION - Flexible middle area with top padding for fixed header and bottom padding for fixed navbar */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-20 min-h-0">
        {/* Card + page switcher */}
        <div className="flex flex-col items-center w-full max-w-sm gap-6">
          {/* Card Container */}
          <div
            ref={containerRef}
            className="w-full transition-all duration-300 ease-in-out"
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
            onTouchStart={handleTouchStart}
          >
            <div 
              className={`transform transition-all duration-300 ease-in-out ${
                isTransitioning ? 'scale-95 opacity-80' : 'scale-100 opacity-100'
              }`}
            >
              <AboutCard cardIndex={currentCardIndex} quote={quotes[currentCardIndex]} />
            </div>
          </div>
          
          {/* Page Indicator */}
          <div className="flex flex-row justify-center items-center w-full h-4 gap-2">
            {quotes.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentCardIndex ? 'bg-[#589D96]' : 'bg-[#D4D4D4]'
                }`}
                onClick={() => changeCard(index)}
              />
            ))}
          </div>
        </div>
      </main>

      {/* NAVBAR SECTION - Fixed at bottom */}
      <MobileNavbar
        text={currentCardIndex < quotes.length - 1 ? 'Weiter' : 'Entdecke deine Ummah'}
        onClick={() => {
          if (currentCardIndex < quotes.length - 1) {
            changeCard(currentCardIndex + 1);
          } else {
            if (onComplete) {
              onComplete();
            } else {
              router.push('/');
            }
          }
        }}
      />
    </div>
  );
}

