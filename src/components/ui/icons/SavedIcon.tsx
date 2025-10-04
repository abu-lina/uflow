'use client';

interface SavedIconProps {
  className?: string;
  isActive?: boolean;
  height?: number;
  width?: number;
}

export function SavedIcon({
  className = '',
  isActive = false,
  height = 24,
  width = 28,
}: SavedIconProps) {
  if (isActive) {
    // Active state - use the new filled design
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width: 48, height: 48 }}>
        <svg
          fill="none"
          height="48"
          viewBox="0 0 49 48"
          width="49"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M34.6514 25.8893L26.811 33.7571C26.2912 34.2785 25.5863 34.5714 24.8513 34.5714C24.1163 34.5714 23.4114 34.2785 22.8916 33.7571L15.0512 25.8907C14.4031 25.2461 13.8882 24.4794 13.5362 23.6347C13.1842 22.7899 13.002 21.8837 13 20.9681C12.998 20.0524 13.1763 19.1454 13.5246 18.2991C13.8729 17.4528 14.3844 16.6839 15.0297 16.0364C15.675 15.389 16.4414 14.8758 17.2849 14.5263C18.1284 14.1769 19.0324 13.998 19.945 14C20.8575 14.002 21.7607 14.1849 22.6027 14.538C23.4447 14.8912 24.2088 15.4077 24.8513 16.058C26.1563 14.7813 27.91 14.0718 29.7327 14.0833C31.5553 14.0947 33.3001 14.8262 34.589 16.1192C35.8779 17.4123 36.6072 19.1627 36.6189 20.9914C36.6306 22.8201 35.9237 24.5798 34.6514 25.8893Z"
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
  const color = '#777777';
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ width: 48, height: 48 }}>
      <svg
        fill="none"
        height={height}
        viewBox="0 0 28 24"
        width={width}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M23.8062 13.6032L15.9658 21.471C15.446 21.9924 14.7411 22.2853 14.0061 22.2853C13.2711 22.2853 12.5662 21.9924 12.0463 21.471L4.20598 13.6046C3.55786 12.96 3.04303 12.1933 2.69103 11.3485C2.33903 10.5037 2.1568 9.59753 2.1548 8.68191C2.1528 7.76629 2.33108 6.85929 2.67938 6.01298C3.02769 5.16668 3.53918 4.39773 4.18447 3.75029C4.82977 3.10285 5.59617 2.58966 6.43967 2.24019C7.28317 1.89073 8.18716 1.71186 9.09975 1.71387C10.0123 1.71587 10.9155 1.89871 11.7575 2.25188C12.5995 2.60505 13.3636 3.1216 14.0061 3.77187C15.3111 2.49515 17.0648 1.78567 18.8875 1.79713C20.7101 1.80859 22.4549 2.54006 23.7438 3.83308C25.0327 5.12611 25.762 6.87657 25.7737 8.70528C25.7854 10.534 25.0785 12.2937 23.8062 13.6032Z"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />
      </svg>
    </div>
  );
}
