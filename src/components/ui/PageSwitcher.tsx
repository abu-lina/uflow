import React from 'react';
import OrnamentStar from './ornamentStar';

interface PageSwitcherProps {
  currentPage: number;
  totalPages: number;
  className?: string;
}

const PageSwitcher: React.FC<PageSwitcherProps> = ({ currentPage, totalPages, className }) => {
  return (
    <div className={`flex flex-row items-center gap-[5.37px] ${className}`}>
      {Array.from({ length: totalPages }).map((_, index) => (
        <OrnamentStar key={index} isActive={currentPage === index} />
      ))}
    </div>
  );
};

export default PageSwitcher; 