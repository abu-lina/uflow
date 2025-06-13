'use client';

interface ProfileIconProps {
  className?: string;
  isActive?: boolean;
  height?: number;
  width?: number;
}

export function ProfileIcon({
  className = '',
  isActive = false,
  height = 32,
  width = 32,
}: ProfileIconProps) {
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
      <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="M27 29v-2a6 6 0 0 0-6-6H11a6 6 0 0 0-6 6v2" />
        <circle cx="16" cy="11" r="6" />
      </g>
    </svg>
  );
}
