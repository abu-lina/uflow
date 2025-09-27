'use client';

interface CreateIconProps {
  className?: string;
  isActive?: boolean;
}

export function CreateIcon({
  className = '',
  isActive = false,
}: CreateIconProps) {
  if (isActive) {
    // Active state - use the same design but with active color
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
          d="M25 17.2627V30.7364M18.2632 23.9995H31.7369"
          stroke="#589D96"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />
      </svg>
    );
  }

  // Inactive state - use the exact icon provided
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
        d="M25 17.2627V30.7364M18.2632 23.9995H31.7369"
        stroke="#777777"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}
