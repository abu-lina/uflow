'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import { Logo } from '@/components/ui/Logo';
import { AboutCard } from '@/components/shared/AboutCard';
import { quotes } from '@/constants/quotes';

export function AboutPageContent() {
  const router = useRouter();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  return (
    <div 
      className="flex flex-col items-center px-4 h-screen overflow-hidden"
      style={{ 
        background: 'linear-gradient(180deg, #F5F5F5 0%, #FBFBFB 100%)'
      }}
    >
      {/* Header */}
      <div className="flex flex-col items-center w-[361px] h-[88px] pt-10">
        {/* Camera Notch Area */}
        <div className="w-[361px] h-[40px]" />
        
        {/* Title */}
        <div className="flex flex-row justify-between items-center w-full h-[48px] gap-2 px-4">
          {/* Left Side - Back Button + Title */}
          <div className="flex flex-row items-center gap-2">
            <button
              className="flex h-8 w-8 items-center justify-center"
              onClick={() => router.back()}
            >
              <Icon className="h-8 w-8 text-[#232323]" icon="material-symbols:chevron-left" />
            </button>
            <h1 className="font-inter-tight text-xl font-bold text-[#232323]">
              Über Uns
            </h1>
          </div>
          
          {/* Right Side - Logo */}
          <div className="relative w-12 h-12 flex-shrink-0">
            <Logo className="w-12 h-12" height={48} width={48} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col items-center justify-center w-full flex-1 pb-20">
        {/* Card + Page Indicator Group */}
        <div className="flex flex-col items-center w-full px-6 gap-2">
          <AboutCard quote={quotes[currentCardIndex]} />
          
          {/* Page Indicator */}
          <div className="flex flex-row justify-center items-center w-full h-4 gap-2">
            {quotes.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentCardIndex ? 'bg-[#589D96]' : 'bg-[#D4D4D4]'
                }`}
                onClick={() => setCurrentCardIndex(index)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Weiter Button - Sticky Bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-row justify-center items-center w-full bg-white px-4 py-4 pb-safe">
        <button 
          className="flex flex-row justify-center items-center w-[345px] h-12 bg-[#589D96] rounded-xl px-5 py-4 gap-2"
          onClick={() => router.push('/')}
        >
          <span className="font-inter-tight text-base font-medium text-white text-center">
            Weiter
          </span>
          <Icon className="h-6 w-6 text-white" icon="material-symbols:chevron-right" />
        </button>
      </div>
    </div>
  );
}

