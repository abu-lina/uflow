'use client';

interface CreateIconProps {
  className?: string;
  isActive?: boolean;
  height?: number;
  width?: number;
}

export function CreateIcon({
  className = '',
  isActive = false,
  height = 32,
  width = 32,
}: CreateIconProps) {
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
        d="M16 8v16m-8-8h16"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
