"use client"

import React, { useState, useCallback } from "react"
import InnerFrame from "./InnerFrame"
import OrnamentStar from "./ornamentStar"
import { QUOTES } from "@/constants/quotes"

interface QuoteCardProps {
  className?: string
}

const SWIPE_THRESHOLD = 50;

const QuoteContent = ({ title, quote, attribution }: typeof QUOTES[number]) => (
  <div className="absolute inset-[44px] flex flex-col items-center justify-center text-center">
    <div className="w-full px-5 font-inter-tight font-medium text-[32px] leading-[120%] text-black mb-6">
      {title}
    </div>
    <blockquote className="w-full px-5">
      <p className="font-inter italic font-medium text-[20px] leading-[140%] text-[#232323] text-center mb-6">
        &ldquo;{quote}&rdquo;
      </p>
    </blockquote>
    <footer className="w-full px-5 font-inter italic font-light text-[14px] leading-[140%] text-right text-[#7A7A7A]">
      - {attribution}
    </footer>
  </div>
);

export default function QuoteCard({ className = "" }: QuoteCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % QUOTES.length)
  }, [])

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + QUOTES.length) % QUOTES.length)
  }, [])

  const handleStarClick = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > SWIPE_THRESHOLD) {
      handleNext()
    } else if (touchEnd - touchStart > SWIPE_THRESHOLD) {
      handlePrev()
    }
  }

  return (
    <div 
      className={`relative w-[560px] h-[400px] ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Main Card */}
      <div className="absolute inset-0 bg-[#BFDBD8] rounded-[32px]">
        {/* Background Rectangle */}
        <div className="absolute inset-0 rounded-[32px] bg-[#BFDBD8]" />

        {/* Inner Frame Container - equal padding on all sides */}
        <div className="absolute inset-[24px]">
          <InnerFrame className="w-full h-full [&>g>path]:stroke-white [&>g>path]:stroke-[1.52941]" />
        </div>

        {/* Content Container */}
        <QuoteContent {...QUOTES[currentIndex]} />
      </div>

      {/* Page Switcher */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex flex-row items-center gap-[8px] w-[53px] h-[12px]">
        {QUOTES.map((_, index) => (
          <OrnamentStar 
            key={index}
            isActive={index === currentIndex}
            className="transform scale-y-[-1] cursor-pointer"
            onClick={() => handleStarClick(index)}
          />
        ))}
      </div>
    </div>
  )
} 