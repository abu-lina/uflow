import React, { useState } from 'react';
import Ornament from './Ornament';

interface LikeButtonProps {
  onClick?: () => void;
  className?: string;
}

const LikeButton: React.FC<LikeButtonProps> = ({ onClick, className }) => {
  const [isClicked, setIsClicked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    setIsClicked(!isClicked);
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`flex flex-row items-center justify-center gap-[6px] px-[20px] w-[201px] h-[56px] rounded-[16.8px] bg-[#589D96] relative ${className} ${
        isClicked ? 'before:content-[""] before:absolute before:inset-[-1px] before:rounded-[17.8px] before:bg-gradient-to-r before:from-[#D2B581] before:via-[#E5D1A0] before:to-[#AF8650] before:-z-10' : ''
      }`}
    >
      <div className="w-[24px] h-[24px] relative">
        <Ornament variant={isClicked ? 'gold' : 'small'} className="absolute left-[0.11%] right-[0.56%] top-[0.44%] bottom-[0.08%] w-full h-full" />
      </div>
      <span className={`font-['Inter_Tight'] text-[20px] font-medium leading-[24px] text-center ${
        isClicked 
          ? 'bg-[radial-gradient(47.83%_95.65%_at_52.17%_47.83%,_#D2B581_0%,_#E5D1A0_50%,_#D2B581_100%)] bg-clip-text text-transparent'
          : 'text-white'
      }`}>
        {isClicked ? 'Gemerkt' : (isHovered ? 'Allāhuma Bārik' : 'Merken')}
      </span>
    </button>
  );
};

export default LikeButton; 