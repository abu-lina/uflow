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
    // Active state - use the new filled design
    return (
      <svg
        className={className}
        fill="none"
        height="24"
        viewBox="0 0 24 24"
        width="24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M20.0134 10.8627C20.0134 13.3841 18.9933 15.6672 17.3434 17.3221C15.6868 18.9834 13.3954 20.0115 10.8639 20.0115C5.81073 20.0115 1.71436 15.9154 1.71436 10.8627C1.71436 5.80993 5.81073 1.71387 10.8639 1.71387C15.917 1.71387 20.0134 5.80993 20.0134 10.8627Z"
          fill="#589D96"
        />
        <path
          d="M22.307 22.2853L17.3434 17.3221M17.3434 17.3221C18.9933 15.6672 20.0134 13.3841 20.0134 10.8627M17.3434 17.3221C15.6868 18.9834 13.3954 20.0115 10.8639 20.0115M20.0134 10.8627C20.0134 15.9154 15.917 20.0115 10.8639 20.0115M20.0134 10.8627C20.0134 5.80993 15.917 1.71387 10.8639 1.71387C5.81073 1.71387 1.71436 5.80993 1.71436 10.8627C1.71436 15.9154 5.81073 20.0115 10.8639 20.0115"
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
