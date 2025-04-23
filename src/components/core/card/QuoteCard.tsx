"use client"

import React, { useState, useCallback, forwardRef } from "react"
import InnerFrame from "@/components/core/layout/inner-frame"
import { OrnamentStar } from "@/components/core/visuals/ornament-star"
import { QUOTES } from "@/constants/quotes"
import { cn } from "@/lib/utils"

interface QuoteCardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

const QuoteCard = forwardRef<HTMLDivElement, QuoteCardProps>(
  ({ className, ...props }, ref) => {
    const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0)
    const [touchStart, setTouchStart] = useState<number | null>(null)

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
      setTouchStart(e.targetTouches[0].clientX)
    }, [])

    const handleTouchMove = useCallback(
      (e: React.TouchEvent) => {
        if (!touchStart) return

        const currentTouch = e.targetTouches[0].clientX
        const diff = touchStart - currentTouch

        if (Math.abs(diff) > 50) {
          if (diff > 0) {
            setCurrentQuoteIndex((prev) =>
              prev === QUOTES.length - 1 ? 0 : prev + 1
            )
          } else {
            setCurrentQuoteIndex((prev) =>
              prev === 0 ? QUOTES.length - 1 : prev - 1
            )
          }
          setTouchStart(null)
        }
      },
      [touchStart]
    )

    const currentQuote = QUOTES[currentQuoteIndex]

    return (
      <div
        ref={ref}
        className={cn(
          "relative w-full max-w-2xl mx-auto",
          className
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        {...props}
      >
        <InnerFrame className="p-8">
          <div className="relative">
            <div className="absolute -top-4 -left-4">
              <OrnamentStar className="w-8 h-8 text-primary" />
            </div>
            <div className="absolute -bottom-4 -right-4">
              <OrnamentStar className="w-8 h-8 text-primary" />
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-semibold mb-2">{currentQuote.title}</h3>
              <blockquote className="text-lg italic text-gray-700">
                "{currentQuote.quote}"
              </blockquote>
              <footer className="mt-4 text-right text-sm text-gray-600">
                - {currentQuote.attribution}
              </footer>
            </div>
          </div>
        </InnerFrame>
        <div className="flex justify-center mt-4 space-x-2">
          {QUOTES.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuoteIndex(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                index === currentQuoteIndex
                  ? "bg-primary"
                  : "bg-gray-300"
              )}
              aria-label={`Go to quote ${index + 1}`}
            />
          ))}
        </div>
      </div>
    )
  }
)

QuoteCard.displayName = "QuoteCard"

export { QuoteCard } 