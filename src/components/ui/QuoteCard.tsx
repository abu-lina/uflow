import React from "react"
import Ornament from "./Ornament"
import InnerFrame from "./InnerFrame"
import OrnamentStar from "./ornamentStar"

interface QuoteCardProps {
  quote: string
  attribution: string
  className?: string
  title?: string
}

export default function QuoteCard({ quote, attribution, className = "", title = "Viele Muslime aber wenig Gemeinschaft" }: QuoteCardProps) {
  return (
    <div className={`flex flex-col items-center gap-[8px] relative w-[546px] h-[363.8px] ${className}`}>
      {/* Main Card */}
      <div className="relative w-[546px] h-[355px] bg-[#BFDBD8] rounded-[30.4364px] flex-none order-0">
        {/* Background Rectangle */}
        <div className="absolute inset-0 rounded-[30.4364px] bg-[#BFDBD8]" />

        {/* Inner Frame Container */}
        <div className="absolute w-[487px] h-[287px] left-[30px] top-[34px]">
          <InnerFrame className="absolute w-[485px] h-[285px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 [&>g>path]:stroke-white [&>g>path]:stroke-[1.52941]" />
        </div>

        {/* Top Ornament - Aligned with InnerFrame top line */}
        <div className="absolute w-[53.53px] h-[26.37px] left-1/2 -translate-x-1/2 top-[23px]">
          <Ornament className="w-full h-full [&>path]:fill-white [&>path]:stroke-[#BFDBD8] [&>path]:stroke-[0.087747]" />
        </div>

        {/* Bottom Ornament - Aligned with InnerFrame bottom line */}
        <div className="absolute w-[53.53px] h-[26.37px] left-1/2 -translate-x-1/2 bottom-[23px]">
          <Ornament className="w-full h-full [&>path]:fill-white [&>path]:stroke-[#BFDBD8] [&>path]:stroke-[0.087747] rotate-180" />
        </div>

        {/* Content */}
        <div className="absolute w-[444px] h-[199px] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="flex flex-col items-center text-center">
            {/* Title */}
            <div className="relative w-[406px] h-[100px] -mt-[8px] mb-[8px] font-inter-tight font-medium text-[36px] leading-[140%] flex items-center text-center text-black">
              {title}
            </div>
            <blockquote className="mb-[8.06px] w-[443.29px]">
              <p className="font-inter italic font-medium text-[16px] leading-[150%] text-[#232323] text-justify">&ldquo;{quote}&rdquo;</p>
            </blockquote>
            <footer className="w-[443.29px] font-inter italic font-light text-[12.8px] leading-[140%] text-right text-black">
              - {attribution}
            </footer>
          </div>
        </div>
      </div>

      {/* Page Switcher */}
      <div className="flex flex-row items-center gap-[8px] w-[53px] h-[12px] flex-none order-1">
        <OrnamentStar isActive={true} className="transform scale-y-[-1]" />
        <OrnamentStar isActive={false} className="transform scale-y-[-1]" />
        <OrnamentStar isActive={false} className="transform scale-y-[-1]" />
      </div>
    </div>
  )
} 