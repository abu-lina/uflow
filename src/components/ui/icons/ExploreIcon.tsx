'use client';

interface ExploreIconProps {
  className?: string;
  isActive?: boolean;
}

export function ExploreIcon({
  className = '',
  isActive = false,
}: ExploreIconProps) {
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
          d="M34.307 34.2853L29.3434 29.3221M32.0134 22.8627C32.0134 27.9154 27.917 32.0115 22.8639 32.0115C17.8107 32.0115 13.7144 27.9154 13.7144 22.8627C13.7144 17.8099 17.8107 13.7139 22.8639 13.7139C27.917 13.7139 32.0134 17.8099 32.0134 22.8627Z"
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
        d="M34.307 34.2853L29.3434 29.3221M32.0134 22.8627C32.0134 27.9154 27.917 32.0115 22.8639 32.0115C17.8107 32.0115 13.7144 27.9154 13.7144 22.8627C13.7144 17.8099 17.8107 13.7139 22.8639 13.7139C27.917 13.7139 32.0134 17.8099 32.0134 22.8627Z"
        stroke="#777777"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}
