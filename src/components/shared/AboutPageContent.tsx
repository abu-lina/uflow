'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { PageHeader } from '@/components/layout/PageHeader';
import Image from 'next/image';
import { PageLayout } from '@/components/layout/PageLayout';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { PageContentWrapper } from '@/components/layout/PageContentWrapper';
import { BottomSpacer } from '@/components/layout/BottomSpacer';
import { AboutCard } from '@/components/shared/AboutCard';
import { quotes } from '@/constants/quotes';
import { FooterAction } from '@/components/ui/FooterAction';

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
    <PageLayout hasBackground={false} maxWidth="full">
      {/* HEADER SECTION - Fixed at top using reusable header */}
      <PageHeader 
        rightIcon={
          <Image
            alt="UFlow Logo"
            className="h-12 w-12 rounded-full"
            height={48}
            src="/icons/icon-round-512.png"
            width={48}
          />
        }
        title={showSplashHeader ? '' : 'Über Uns'}
        variant={showSplashHeader ? 'title-only' : 'back-title-icon'}
        onBack={showSplashHeader ? undefined : () => router.back()}
      />

      <HeaderSpacer />

      {/* CONTENT SECTION - Flexible middle area with proper centering */}
      <PageContentWrapper 
        centerVertically={true}
        contentClassName="flex flex-col items-center gap-4 pb-8"
        includeMobileNavSpacing={false}
        maxWidth="full"
        padding="lg-safe"
      >
        {/* Card Container */}
        <div
          ref={containerRef}
          className="w-full flex justify-center transition-all duration-300 ease-in-out"
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
        <div className="flex flex-row justify-center items-center w-full gap-2">
          {quotes.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentCardIndex ? 'bg-primary' : 'bg-[#D4D4D4]'
              }`}
              onClick={() => changeCard(index)}
            />
          ))}
        </div>
      </PageContentWrapper>

      <BottomSpacer />

      {/* FOOTER ACTION - Fixed at bottom */}
      <FooterAction
        actionButton={{
          label: currentCardIndex < quotes.length - 1 ? 'Weiter' : 'Entdecke deine Ummah',
          trailingIcon: 'material-symbols:chevron-right',
          onClick: () => {
          if (currentCardIndex < quotes.length - 1) {
            changeCard(currentCardIndex + 1);
          } else {
            if (onComplete) {
              onComplete();
            } else {
              router.push('/');
            }
          }
          },
          variant: 'primary',
        }}
      />
    </PageLayout>
  );
}


