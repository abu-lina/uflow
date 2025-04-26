"use client"

import React, { forwardRef } from "react"
import { cn } from "@/lib/utils"
import { HTMLAttributes } from 'react'
import { Quote } from '@/constants/quotes'

const DEFAULT_QUOTE: Quote = {
  text: "Wer auch immer eine gute Tat vollbringt, dem werden wir noch mehr Gutes hinzufügen.",
  author: "Koran, Sure 42, Vers 23"
};

interface QuoteCardProps extends HTMLAttributes<HTMLDivElement> {
  quote?: Quote;
}

export const QuoteCard = forwardRef<HTMLDivElement, QuoteCardProps>(
  ({ className, quote = DEFAULT_QUOTE, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-white rounded-lg shadow-sm p-6 space-y-4',
          className
        )}
        {...props}
      >
        <blockquote className="text-lg italic text-gray-700">
          &quot;{quote.text}&quot;
        </blockquote>
        <cite className="block text-sm text-gray-500 not-italic">
          — {quote.author}
        </cite>
      </div>
    )
  }
)

QuoteCard.displayName = "QuoteCard" 