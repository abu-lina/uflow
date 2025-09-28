'use client';

interface HeartIconProps {
  className?: string;
  isActive?: boolean;
  height?: number;
  width?: number;
  filled?: boolean;
  color?: string;
}

export function HeartIcon({
  className = '',
  isActive = false,
  height = 24,
  width = 28,
  filled = false,
  color,
}: HeartIconProps) {
  const iconColor = color || (isActive ? '#589D96' : '#777777');
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ width: 48, height: 48 }}>
      <svg
        fill={filled ? iconColor : 'none'}
        height={height}
        viewBox="0 0 28 24"
        width={width}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M23.8062 13.6032L15.9658 21.471C15.446 21.9924 14.7411 22.2853 14.0061 22.2853C13.2711 22.2853 12.5662 21.9924 12.0463 21.471L4.20598 13.6046C3.55786 12.96 3.04303 12.1933 2.69103 11.3485C2.33903 10.5037 2.1568 9.59753 2.1548 8.68191C2.1528 7.76629 2.33108 6.85929 2.67938 6.01298C3.02769 5.16668 3.53918 4.39773 4.18447 3.75029C4.82977 3.10285 5.59617 2.58966 6.43967 2.24019C7.28317 1.89073 8.18716 1.71186 9.09975 1.71387C10.0123 1.71587 10.9155 1.89871 11.7575 2.25188C12.5995 2.60505 13.3636 3.1216 14.0061 3.77187C15.3111 2.49515 17.0648 1.78567 18.8875 1.79713C20.7101 1.80859 22.4549 2.54006 23.7438 3.83308C25.0327 5.12611 25.762 6.87657 25.7737 8.70528C25.7854 10.534 25.0785 12.2937 23.8062 13.6032Z"
          stroke={filled ? 'none' : iconColor}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />
      </svg>
    </div>
  );
}
