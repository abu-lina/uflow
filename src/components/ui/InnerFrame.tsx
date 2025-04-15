import React from 'react';

interface InnerFrameProps {
  className?: string;
}

const InnerFrame: React.FC<InnerFrameProps> = ({ className }) => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 487 287"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <g id="innerFrame">
        <path
          id="frame"
          d="M274.392 1H473.825C480.549 1 486 6.45073 486 13.1746V128.386V160.053V273.825C486 280.549 480.549 286 473.825 286H274.392M211.836 1H13.1746C6.45073 1 1 6.45074 1 13.1746V273.825C1 280.549 6.45075 286 13.1746 286H211.836"
          stroke="white"
          strokeWidth="1.52941"
        />
      </g>
    </svg>
  );
};

export default InnerFrame; 