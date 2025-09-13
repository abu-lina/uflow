interface BrokenHeartIconProps {
  className?: string;
  size?: number;
}

export function BrokenHeartIcon({ className = "", size = 24 }: BrokenHeartIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 144 144"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M132 54.8278C132 25.6498 99 4.95584 72 32.9998L63 50.9998L78 66.5L66 86.9998L78 98.9998L72 123C78 123 84 118.374 90.228 113.472C107.88 99.5518 132 84.0058 132 54.8278Z"
        fill="#333333"
      />
      <path
        d="M72 32.9998C45 4.95584 12 25.6498 12 54.8278C12 84.0058 36.12 99.5518 53.772 113.472C60 118.374 66 123 72 123L78 98.9998L66 86.9998L78 66.5L63 50.9998L72 32.9998Z"
        fill="#333333"
      />
      <path
        d="M72 32.9998C45 4.95584 12 25.6498 12 54.8278C12 84.0058 36.12 99.5518 53.772 113.472C60 118.374 66 123 72 123M72 32.9998C99 4.95584 132 25.6498 132 54.8278C132 84.0058 107.88 99.5518 90.228 113.472C84 118.374 78 123 72 123M72 32.9998L63 50.9998L78 66.5L66 86.9998L78 98.9998L72 123"
        stroke="white"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
