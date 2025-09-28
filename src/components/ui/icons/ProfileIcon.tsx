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
  const color = isActive ? '#589D96' : '#7A7A7A';
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
