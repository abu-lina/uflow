import React from 'react';

interface PlaceholderProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function Placeholder({ width = 200, height = 150, className = '' }: PlaceholderProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width={width} height={height} fill="#F3F4F6" />
      <path
        d="M100 50C100 55.5228 95.5228 60 90 60C84.4772 60 80 55.5228 80 50C80 44.4772 84.4772 40 90 40C95.5228 40 100 44.4772 100 50Z"
        fill="#9CA3AF"
      />
      <rect x="60" y="70" width="60" height="8" rx="4" fill="#9CA3AF" />
      <rect x="50" y="85" width="80" height="6" rx="3" fill="#9CA3AF" />
    </svg>
  );
} 