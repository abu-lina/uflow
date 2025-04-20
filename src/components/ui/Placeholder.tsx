import React from 'react';

interface PlaceholderProps {
  width?: number;
  height?: number;
  className?: string;
}

const Placeholder: React.FC<PlaceholderProps> = ({ width = 100, height = 30, className = '' }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width={width} height={height} fill="#BFDBD8" />
      <path
        fill="white"
      />
    </svg>
  );
};

export default Placeholder; 