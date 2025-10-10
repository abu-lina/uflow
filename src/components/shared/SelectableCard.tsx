import Image from 'next/image';
import { Icon } from '@iconify/react';

interface SelectableCardProps {
  imageUrl: string;
  title: string;
  category?: string;
  
  // Optional bottom text (address or donation count)
  bottomText?: string;
  
  // Selection state (for social project selection)
  isSelected?: boolean;
  
  // Action button behavior
  actionType?: 'select' | 'unsave';
  onAction?: () => void;
  
  // Card click
  onClick?: () => void;
}

export function SelectableCard({
  imageUrl,
  title,
  category,
  bottomText,
  isSelected = false,
  actionType = 'select',
  onAction,
  onClick,
}: SelectableCardProps) {
  return (
    <div
      className={`relative flex h-[212.5px] w-[160px] cursor-pointer flex-col items-start p-0 transition-all duration-200 ${
        isSelected ? 'ring-2 ring-[#589D96] rounded-2xl ring-offset-2 ring-offset-white' : ''
      }`}
      onClick={onClick}
    >
      {/* Image Container */}
      <div className="relative flex h-[145.41px] w-[160px] flex-col justify-between items-center p-0 gap-[5px] rounded-t-2xl overflow-hidden">
        <Image
          alt={title}
          className="rounded-t-2xl object-cover"
          height={145}
          src={imageUrl}
          style={{ height: '100%', width: '100%' }}
          width={160}
        />
        
        {/* Action Button - Top Right */}
        <div className="absolute right-0 top-0 flex flex-col items-end p-[6.49px] w-[160px] h-[36.97px]">
          <button
            className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#CDCDCD] bg-white/70 backdrop-blur-[1.25px]"
            onClick={(e) => {
              e.stopPropagation();
              onAction?.();
            }}
          >
            <Icon 
              className="w-[18px] h-[18px] text-content-title" 
              icon={
                actionType === 'unsave' 
                  ? "material-symbols:close-rounded" 
                  : isSelected 
                    ? "material-symbols:close-rounded" 
                    : "material-symbols:add-rounded"
              } 
            />
          </button>
        </div>
        
        {/* Category Badge - Bottom Left */}
        {category && (
          <div className="absolute left-0 bottom-0 flex flex-col justify-end items-start p-[6.49px]">
            <div className="flex items-center justify-center px-2 py-1 h-[22px] bg-white/70 border border-[#CDCDCD] backdrop-blur-[1.24px] rounded-[5.96px]">
              <span className="font-inter-tight text-xs font-medium text-[#232323] whitespace-nowrap">
                {category}
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Card Content */}
      <div className="flex flex-col items-center p-2 w-[160px] h-[67.1px] bg-white border border-[#D4D4D4] rounded-b-2xl">
        <div className="flex flex-col items-start gap-2 w-[144px] h-[51.1px]">
          {/* Title */}
          <div className="flex flex-col items-start gap-[1.5px] w-[144px] h-[19px]">
            <span className="font-inter-tight text-base font-semibold text-[#232323] leading-[19px] w-[144px] h-[19px] truncate">
              {title}
            </span>
          </div>
          
          {/* Bottom Text (Address or Donation Count) */}
          {bottomText && (
            <div className="flex items-start w-full h-[16.1px]">
              <span className="font-inter-tight text-xs font-normal text-[#232323] truncate">
                {bottomText}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

