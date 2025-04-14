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
        d="M20 15C20 17.2091 18.2091 19 16 19C13.7909 19 12 17.2091 12 15C12 12.7909 13.7909 11 16 11C18.2091 11 20 12.7909 20 15Z"
        fill="white"
      />
      <path
        d="M80 15C80 17.2091 78.2091 19 76 19C73.7909 19 72 17.2091 72 15C72 12.7909 73.7909 11 76 11C78.2091 11 80 12.7909 80 15Z"
        fill="white"
      />
    </svg>
  );
};

export default Placeholder; 