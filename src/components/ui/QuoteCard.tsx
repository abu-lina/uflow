"use client"

import React, { useState, useCallback } from "react"
import InnerFrame from "./InnerFrame"
import OrnamentStar from "./ornamentStar"

interface QuoteCardProps {
  className?: string
}

const quotes = [
  {
    title: "Viele Muslime aber wenig Gemeinschaft",
    quote: "Es wird eine Zeit kommen, in der die Muslime viele sein werden, doch ihr Zusammenhalt wird so schwach sein wie der Schaum des Meeres.",
    attribution: "Der Prophet Mohammed ﷺ, Sahih Muslim"
  },
  {
    title: "Gemeinsam sind wir stark",
    quote: "Die Gläubigen sind wie ein Gebäude, dessen Teile einander stützen.",
    attribution: "Der Prophet Mohammed ﷺ, Sahih Muslim"
  },
  {
    title: "Einheit in der Vielfalt",
    quote: "Die Muslime sind wie ein Körper. Wenn ein Teil leidet, leidet der ganze Körper.",
    attribution: "Der Prophet Mohammed ﷺ, Sahih Muslim"
  }
]

export default function QuoteCard({ className = "" }: QuoteCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % quotes.length)
  }, [])

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + quotes.length) % quotes.length)
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
    if (touchStart - touchEnd > 50) {
      handleNext()
    } else if (touchEnd - touchStart > 50) {
      handlePrev()
    }
  }

  return (
    <div className={`relative w-[560px] h-[400px] ${className}`}>
      {/* Main Card */}
      <div className="absolute inset-0 bg-[#BFDBD8] rounded-[32px]">
        {/* Background Rectangle */}
        <div className="absolute inset-0 rounded-[32px] bg-[#BFDBD8]" />

        {/* Inner Frame Container - equal padding on all sides */}
        <div className="absolute inset-[24px]">
          <InnerFrame className="w-full h-full [&>g>path]:stroke-white [&>g>path]:stroke-[1.52941]" />
        </div>

        {/* Content Container - with proper text padding */}
        <div className="absolute inset-[44px] flex flex-col items-center justify-center text-center">
          {/* Title */}
          <div className="w-full px-5 font-inter-tight font-medium text-[32px] leading-[120%] text-black mb-6">
            {quotes[currentIndex].title}
          </div>
          <blockquote className="w-full px-5">
            <p className="font-inter italic font-medium text-[20px] leading-[140%] text-[#232323] text-center mb-6">
              &ldquo;{quotes[currentIndex].quote}&rdquo;
            </p>
          </blockquote>
          <footer className="w-full px-5 font-inter italic font-light text-[14px] leading-[140%] text-right text-[#7A7A7A]">
            - {quotes[currentIndex].attribution}
          </footer>
        </div>
      </div>

      {/* Page Switcher */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex flex-row items-center gap-[8px] w-[53px] h-[12px]">
        {quotes.map((_, index) => (
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