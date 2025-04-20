import React from 'react';
import QuoteCard from './QuoteCard';
import PageSwitcher from './PageSwitcher';

interface WhyProps {
  className?: string;
}

const Why: React.FC<WhyProps> = ({ className }) => {
  return (
    <div className={`flex flex-col items-center gap-[10.05px] w-[717.56px] h-[502px] relative ${className}`}>
      {/* Main container */}
      <div className="w-[717.56px] h-[482.39px] bg-[#BFDBD8] rounded-[40px] flex-none order-0 self-stretch flex-grow-0">
        {/* Quote Card */}
        <div className="absolute w-[638px] h-[437.66px] left-[40px] top-[23px]">
          <QuoteCard
            quote="Es wird eine Zeit kommen, in der die Muslime viele sein werden, doch ihr Zusammenhalt wird so schwach sein wie der Schaum des Meeres."
            attribution="-Der Prophet Mohammed Sahih Muslim"
          />
        </div>

        {/* Title */}
        <h2 className="absolute w-[369px] h-[84px] left-[174px] top-[34px] font-['Inter'] font-medium text-[30.1497px] leading-[140%] text-center text-black">
          Warum Ummah Flow?
        </h2>

        {/* Page switcher */}
        <div className="absolute bottom-[20px] left-[calc(50%-20.1px)]">
          <PageSwitcher currentPage={0} totalPages={3} />
        </div>
      </div>
    </div>
  );
};

export default Why; 