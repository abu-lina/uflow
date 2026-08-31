'use client';

interface ChatIconProps {
  className?: string;
  isActive?: boolean;
}

export function ChatIcon({
  className = '',
  isActive = false,
}: ChatIconProps) {
  const strokeColor = isActive ? '#589D96' : '#777777';

  return (
    <svg
      className={className}
      fill="none"
      height="48"
      viewBox="0 0 49 48"
      width="49"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14 16C14 13.7909 15.7909 12 18 12H31C33.2091 12 35 13.7909 35 16V28C35 30.2091 33.2091 32 31 32H22L16 37V32H18C15.7909 32 14 30.2091 14 28V16Z"
        stroke={strokeColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}
