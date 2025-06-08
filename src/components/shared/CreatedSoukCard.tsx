import Image from 'next/image';

import { Icon } from '@iconify/react';

interface CreatedSoukCardProps {
  imageUrl: string;
  title: string;
  category: string;
  tag: string;
  onUnsave?: () => void;
  onClick?: () => void;
}

export function CreatedSoukCard({
  imageUrl,
  title,
  category,
  tag,
  onUnsave,
  onClick,
}: CreatedSoukCardProps) {
  return (
    <div
      className="relative flex cursor-pointer flex-col items-start p-0"
      style={{ width: 161, height: 211.63 }}
      onClick={onClick}
    >
      {/* Image + Unsave Button */}
      <div className="relative h-[146.56px] w-[161px]">
        <Image
          alt={title}
          className="rounded-t-[12.075px] border border-white object-cover"
          height={146.56}
          src={imageUrl}
          style={{ height: 146.56 }}
          width={161}
        />
        {/* Unsave Button */}
        <button
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#CDCDCD] bg-white/70 backdrop-blur-[1.25px]"
          onClick={(e) => {
            e.stopPropagation();
            onUnsave?.();
          }}
        >
          <Icon color="#333333" height={20} icon="iconamoon:heart-fill" width={20} />
        </button>
      </div>
      {/* Category Badge */}
      <div className="absolute left-0 top-[120px] z-20 flex w-[161px] flex-col items-start px-[6.5px]">
        <div className="flex h-5 flex-row items-center rounded-[6px] border border-[#CDCDCD] bg-white/70 px-[6.7px]">
          <span className="font-inter-tight text-[10px] font-medium text-[#232323]">
            {category}
          </span>
        </div>
      </div>
      {/* Card Content */}
      <div className="flex h-[65.31px] w-[161px] flex-col items-center rounded-b-[12.075px] border border-[#D4D4D4] bg-white px-0 pb-0 pt-2">
        <div className="flex w-[144.9px] flex-col items-start gap-[8.05px]">
          {/* Title */}
          <div className="w-full font-inter-tight text-[14px] font-semibold leading-[17px] text-[#232323]">
            {title}
          </div>
          {/* Tag */}
          <div className="flex flex-row items-center gap-[5.76px]">
            <div className="flex flex-row items-center rounded-[2.88px] border border-[#CDCDCD] px-[3.1px] py-[1.55px]">
              <span className="font-inter-tight text-[10.9px] font-medium text-[#232323]">
                {tag}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
