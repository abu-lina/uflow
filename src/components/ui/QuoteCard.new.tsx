import React from "react"

interface QuoteCardProps {
  quote: string
  attribution: string
  className?: string
}

export default function QuoteCard({ quote, attribution, className = "" }: QuoteCardProps) {
  return (
    <div className={`relative w-full max-w-[718px] mx-auto ${className}`}>
      <div className="bg-[#BFDBD8] rounded-[20px] p-12 relative aspect-[718/502]">
        <div className="flex flex-col justify-center items-center h-full text-center">
          <blockquote className="mb-6">
            <p className="text-[24px] italic text-[#232323] font-serif leading-relaxed">"{quote}"</p>
          </blockquote>
          <footer className="text-[16px] text-[#7A7A7A]">- {attribution}</footer>
        </div>
      </div>
    </div>
  )
} 