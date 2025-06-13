'use client';

interface SavedIconProps {
  className?: string;
  isActive?: boolean;
  height?: number;
  width?: number;
}

export function SavedIcon({
  className = '',
  isActive = false,
  height = 32,
  width = 32,
}: SavedIconProps) {
  const color = isActive ? '#589D96' : '#7A7A7A';
  return (
    <svg
      className={className}
      fill="none"
      height={height}
      viewBox="0 0 32 32"
      width={width}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M25.428 17.523l-7.314 7.314a2 2 0 0 1-2.828 0l-7.314-7.314A7 7 0 1 1 16 6.096a7 7 0 0 1 9.428 9.427"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
