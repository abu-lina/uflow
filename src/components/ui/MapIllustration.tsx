'use client';

import { cn } from '@/lib/utils';

interface MapIllustrationProps {
  className?: string;
}

/**
 * Map Illustration Component
 * 
 * Displays a stylized map with location pins showing:
 * - Red pins with X (non-halal locations)
 * - Teal/green pins with "حلال" text (discovered halal locations)
 * - Grey pins with "حلال" text (undiscovered halal locations)
 */
export function MapIllustration({ className = '' }: MapIllustrationProps) {
  return (
    <div
      aria-label="Map illustration showing halal and non-halal locations"
      className={cn(
        'relative w-[295px] h-[241px] bg-[#FBFCF8] rounded-3xl overflow-hidden',
        className
      )}
    >
      {/* Map Border Container */}
      <div
        className="absolute left-[30.42px] top-[34px] w-[232.28px] h-[173.42px] rounded-sm border-[3.01px] border-[#F4F6F2]"
        style={{
          background: 'transparent',
        }}
      >
        {/* Map Grid Lines - Simplified representation */}
        <svg
          className="absolute inset-0 w-full h-full"
          fill="none"
          viewBox="0 0 232 173"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Horizontal lines */}
          <line
            stroke="#F4F6F2"
            strokeWidth="1"
            x1="0"
            x2="232"
            y1="43"
            y2="43"
          />
          <line
            stroke="#F4F6F2"
            strokeWidth="1"
            x1="0"
            x2="232"
            y1="86"
            y2="86"
          />
          <line
            stroke="#F4F6F2"
            strokeWidth="1"
            x1="0"
            x2="232"
            y1="130"
            y2="130"
          />
          {/* Vertical lines */}
          <line
            stroke="#F4F6F2"
            strokeWidth="1"
            x1="58"
            x2="58"
            y1="0"
            y2="173"
          />
          <line
            stroke="#F4F6F2"
            strokeWidth="1"
            x1="116"
            x2="116"
            y1="0"
            y2="173"
          />
          <line
            stroke="#F4F6F2"
            strokeWidth="1"
            x1="174"
            x2="174"
            y1="0"
            y2="173"
          />
        </svg>
      </div>

      {/* Red Pins (Non-halal) */}
      {/* Red Pin 1 - Upper Right */}
      <div
        className="absolute w-[20.03px] h-[25.04px]"
        style={{ left: '190.7px', top: '39.01px' }}
      >
        <svg
          className="w-full h-full"
          fill="none"
          viewBox="0 0 20 25"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Pin shape */}
          <path
            d="M10 0C4.48 0 0 4.48 0 10C0 15.52 10 25 10 25C10 25 20 15.52 20 10C20 4.48 15.52 0 10 0Z"
            fill="#FF5F57"
          />
          {/* White X */}
          <path
            d="M6.89 6.89L13.11 13.11M13.11 6.89L6.89 13.11"
            stroke="#FFFFFF"
            strokeLinecap="round"
            strokeWidth="2.5"
          />
        </svg>
      </div>

      {/* Red Pin 2 - Upper Left */}
      <div
        className="absolute w-[20.03px] h-[25.04px]"
        style={{ left: '59.22px', top: '40.26px' }}
      >
        <svg
          className="w-full h-full"
          fill="none"
          viewBox="0 0 20 25"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Pin shape */}
          <path
            d="M10 0C4.48 0 0 4.48 0 10C0 15.52 10 25 10 25C10 25 20 15.52 20 10C20 4.48 15.52 0 10 0Z"
            fill="#FF5F57"
          />
          {/* White X */}
          <path
            d="M6.89 6.89L13.11 13.11M13.11 6.89L6.89 13.11"
            stroke="#FFFFFF"
            strokeLinecap="round"
            strokeWidth="2.5"
          />
        </svg>
      </div>

      {/* Teal Pin 1 - Large Discovered Halal (Center-Right) */}
      <div
        className="absolute w-[41.74px] h-[50.09px]"
        style={{ left: '164.4px', top: '89.09px' }}
      >
        <svg
          className="w-full h-full"
          fill="none"
          viewBox="0 0 42 50"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Pin shape with gradient */}
          <defs>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="halalGradient1"
              x1="0%"
              x2="0%"
              y1="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#63A49E" />
              <stop offset="40.24%" stopColor="#589C93" />
              <stop offset="100%" stopColor="#6EAFA5" />
            </linearGradient>
          </defs>
          <path
            d="M21 0C9.41 0 0 9.41 0 21C0 32.59 21 50 21 50C21 50 42 32.59 42 21C42 9.41 32.59 0 21 0Z"
            fill="url(#halalGradient1)"
          />
          {/* White circle background for text */}
          <circle cx="21" cy="21" fill="#FFFFFF" r="8.35" />
          {/* White border */}
          <circle cx="21" cy="21" fill="none" r="8.08" stroke="#FFFFFF" strokeWidth="0.32" />
          {/* Arabic text "حلال" - positioned in center */}
          <text
            className="text-[5.6px] font-bold fill-[#589D96] text-center"
            dominantBaseline="middle"
            fontFamily="'Scheherazade New', serif"
            style={{ fontSize: '5.6px', fontWeight: '700' }}
            textAnchor="middle"
            x="21"
            y="24"
          >
            حلال
          </text>
        </svg>
      </div>

      {/* Teal Pin 2 - Small Discovered Halal (Mid-Left) */}
      <div
        className="absolute w-[24.27px] h-[30.05px]"
        style={{ left: '42.94px', top: '110.38px' }}
      >
        <svg
          className="w-full h-full"
          fill="none"
          viewBox="0 0 24 30"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="halalGradient2"
              x1="0%"
              x2="0%"
              y1="0%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#63A49E" />
              <stop offset="40.24%" stopColor="#589C93" />
              <stop offset="100%" stopColor="#6EAFA5" />
            </linearGradient>
          </defs>
          <path
            d="M12 0C5.37 0 0 5.37 0 12C0 18.63 12 30 12 30C12 30 24 18.63 24 12C24 5.37 18.63 0 12 0Z"
            fill="url(#halalGradient2)"
          />
          {/* White circle background */}
          <circle cx="12" cy="12" fill="#FFFFFF" r="5.32" />
          {/* White border */}
          <circle cx="12" cy="12" fill="none" r="5.12" stroke="#FFFFFF" strokeWidth="0.2" />
          {/* Arabic text "حلال" */}
          <text
            className="text-[3.34px] font-bold fill-[#589D96] text-center"
            dominantBaseline="middle"
            fontFamily="'Scheherazade New', serif"
            style={{ fontSize: '3.34px', fontWeight: '700' }}
            textAnchor="middle"
            x="12"
            y="14.5"
          >
            حلال
          </text>
        </svg>
      </div>

      {/* Grey Pins (Undiscovered Halal) */}
      {/* Grey Pin 1 - Top Center */}
      <div
        className="absolute w-[25.04px] h-[30.05px]"
        style={{ left: '125.59px', top: '74.07px' }}
      >
        <svg
          className="w-full h-full"
          fill="none"
          viewBox="0 0 25 30"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12.5 0C5.6 0 0 5.6 0 12.5C0 19.4 12.5 30 12.5 30C12.5 30 25 19.4 25 12.5C25 5.6 19.4 0 12.5 0Z"
            fill="#C6C8C5"
          />
          {/* White circle background */}
          <circle cx="12.5" cy="12.5" fill="#FFFFFF" r="5.01" />
          {/* White border */}
          <circle cx="12.5" cy="12.5" fill="none" r="4.83" stroke="#FBFBFB" strokeWidth="0.19" />
          {/* Arabic text "حلال" in grey */}
          <text
            className="text-[3.15px] font-bold fill-[#B1B3B0] text-center"
            dominantBaseline="middle"
            fontFamily="'Scheherazade New', serif"
            style={{ fontSize: '3.15px', fontWeight: '700' }}
            textAnchor="middle"
            x="12.5"
            y="14.5"
          >
            حلال
          </text>
        </svg>
      </div>

      {/* Grey Pin 2 - Mid-Bottom Left */}
      <div
        className="absolute w-[25.04px] h-[30.05px]"
        style={{ left: '98.04px', top: '150.45px' }}
      >
        <svg
          className="w-full h-full"
          fill="none"
          viewBox="0 0 25 30"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12.5 0C5.6 0 0 5.6 0 12.5C0 19.4 12.5 30 12.5 30C12.5 30 25 19.4 25 12.5C25 5.6 19.4 0 12.5 0Z"
            fill="#C6C8C5"
          />
          <circle cx="12.5" cy="12.5" fill="#FFFFFF" r="5.01" />
          <circle cx="12.5" cy="12.5" fill="none" r="4.83" stroke="#FBFBFB" strokeWidth="0.19" />
          <text
            className="text-[3.15px] font-bold fill-[#B1B3B0] text-center"
            dominantBaseline="middle"
            fontFamily="'Scheherazade New', serif"
            style={{ fontSize: '3.15px', fontWeight: '700' }}
            textAnchor="middle"
            x="12.5"
            y="14.5"
          >
            حلال
          </text>
        </svg>
      </div>

      {/* Grey Pin 3 - Mid-Right */}
      <div
        className="absolute w-[25.04px] h-[30.05px]"
        style={{ left: '233.27px', top: '116.64px' }}
      >
        <svg
          className="w-full h-full"
          fill="none"
          viewBox="0 0 25 30"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12.5 0C5.6 0 0 5.6 0 12.5C0 19.4 12.5 30 12.5 30C12.5 30 25 19.4 25 12.5C25 5.6 19.4 0 12.5 0Z"
            fill="#C6C8C5"
          />
          <circle cx="12.5" cy="12.5" fill="#FFFFFF" r="5.01" />
          <circle cx="12.5" cy="12.5" fill="none" r="4.83" stroke="#FBFBFB" strokeWidth="0.19" />
          <text
            className="text-[3.15px] font-bold fill-[#B1B3B0] text-center"
            dominantBaseline="middle"
            fontFamily="'Scheherazade New', serif"
            style={{ fontSize: '3.15px', fontWeight: '700' }}
            textAnchor="middle"
            x="12.5"
            y="14.5"
          >
            حلال
          </text>
        </svg>
      </div>

      {/* Grey Pin 4 - Bottom Right */}
      <div
        className="absolute w-[25.04px] h-[30.05px]"
        style={{ left: '205.73px', top: '175.49px' }}
      >
        <svg
          className="w-full h-full"
          fill="none"
          viewBox="0 0 25 30"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12.5 0C5.6 0 0 5.6 0 12.5C0 19.4 12.5 30 12.5 30C12.5 30 25 19.4 25 12.5C25 5.6 19.4 0 12.5 0Z"
            fill="#C6C8C5"
          />
          <circle cx="12.5" cy="12.5" fill="#FFFFFF" r="5.01" />
          <circle cx="12.5" cy="12.5" fill="none" r="4.83" stroke="#FBFBFB" strokeWidth="0.19" />
          <text
            className="text-[3.15px] font-bold fill-[#B1B3B0] text-center"
            dominantBaseline="middle"
            fontFamily="'Scheherazade New', serif"
            style={{ fontSize: '3.15px', fontWeight: '700' }}
            textAnchor="middle"
            x="12.5"
            y="14.5"
          >
            حلال
          </text>
        </svg>
      </div>
    </div>
  );
}



