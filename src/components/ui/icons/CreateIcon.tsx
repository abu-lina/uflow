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
  height = 48,
  width = 49,
}: CreateIconProps) {
  if (isActive) {
    // Active state - use the same design but with active color
    return (
      <svg
        className={className}
        width="49"
        height="48"
        viewBox="0 0 49 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M25 17.2627V30.7364M18.2632 23.9995H31.7369"
          stroke="#589D96"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Inactive state - use the exact icon provided
  return (
    <svg
      className={className}
      width="49"
      height="48"
      viewBox="0 0 49 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M25 17.2627V30.7364M18.2632 23.9995H31.7369"
        stroke="#777777"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
