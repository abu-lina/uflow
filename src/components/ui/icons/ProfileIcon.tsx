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
  height = 24,
  width = 20,
}: ProfileIconProps) {
  if (isActive) {
    // Active state - use the new filled design
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width: 48, height: 48 }}>
        <svg
          fill="none"
          height="48"
          viewBox="0 0 48 48"
          width="48"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M32.2144 34.2859V32.0001C32.2144 30.7877 31.7327 29.625 30.8754 28.7677C30.0181 27.9103 28.8553 27.4287 27.6429 27.4287H20.7858C19.5734 27.4287 18.4106 27.9103 17.5533 28.7677C16.696 29.625 16.2144 30.7877 16.2144 32.0001V34.2859H32.2144Z"
            fill="#589D96"
            stroke="#589D96"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.4"
          />
          <path
            d="M28.9285 18.2853C28.9285 20.81 26.8818 22.8567 24.3571 22.8567C21.8323 22.8567 19.7856 20.81 19.7856 18.2853C19.7856 15.7606 21.8323 13.7139 24.3571 13.7139C26.8818 13.7139 28.9285 15.7606 28.9285 18.2853Z"
            fill="#589D96"
            stroke="#589D96"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.4"
          />
        </svg>
      </div>
    );
  }

  // Inactive state - use the existing stroke-only design
  const color = '#7A7A7A';
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ width: 48, height: 48 }}>
      <svg
        fill="none"
        height={height}
        viewBox="0 0 20 24"
        width={width}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M18.2144 22.2859V20.0001C18.2144 18.7877 17.7327 17.625 16.8754 16.7677C16.0181 15.9103 14.8553 15.4287 13.6429 15.4287H6.78578C5.57337 15.4287 4.4106 15.9103 3.5533 16.7677C2.69599 17.625 2.21436 18.7877 2.21436 20.0001V22.2859"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />
        <path
          d="M10.3571 10.8567C12.8818 10.8567 14.9285 8.81003 14.9285 6.2853C14.9285 3.76057 12.8818 1.71387 10.3571 1.71387C7.83234 1.71387 5.78564 3.76057 5.78564 6.2853C5.78564 8.81003 7.83234 10.8567 10.3571 10.8567Z"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />
      </svg>
    </div>
  );
}
