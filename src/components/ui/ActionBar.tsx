import React, { useState } from 'react';
import { Button } from './button';
import Ornament from './Ornament';
import { Share2, Phone, Globe } from 'lucide-react';

interface ActionBarProps {
  onLike?: () => void;
  onShare?: () => void;
  onPhone?: () => void;
  onWebsite?: () => void;
  isLiked?: boolean;
}

const ActionBar: React.FC<ActionBarProps> = ({
  onLike,
  onShare,
  onPhone,
  onWebsite,
  isLiked = false,
}) => {
  const [selectedAction, setSelectedAction] = useState<string>('like');

  const handleActionClick = (action: string, callback?: () => void) => {
    setSelectedAction(action);
    callback?.();
  };

  const getButtonStyle = (action: string, isSelected: boolean) => {
    const isLikeAction = action === 'like';
    return {
      width: isLikeAction ? (isSelected ? 'w-[104px]' : 'w-[40px]') : (isSelected ? 'w-[104px]' : 'w-[40px]'),
      background: isSelected ? 'bg-[#589D96] hover:bg-[#589D96]/90' : 'bg-white hover:bg-[#EEEEEE]',
      iconColor: isSelected ? 'text-white' : 'text-[#232323]',
      textColor: isSelected ? 'text-white' : 'text-[#232323]',
      textDisplay: isLikeAction ? (isSelected ? 'block' : 'hidden') : (isSelected ? 'block' : 'hidden'),
    };
  };

  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-[811px] h-[56px] flex items-center gap-2 p-2 px-2 bg-white border border-[#EEEEEE] rounded-[16.8px]">
      <Button
        variant="action"
        className={`h-[40px] px-3 gap-[6px] rounded-[12px] transition-all duration-200 ${
          getButtonStyle('like', selectedAction === 'like').width
        } ${getButtonStyle('like', selectedAction === 'like').background}`}
        onClick={() => handleActionClick('like', onLike)}
      >
        <Ornament 
          variant={selectedAction === 'like' ? "white24" : "black24"} 
          className={`w-[24px] h-[24px] ${getButtonStyle('like', selectedAction === 'like').iconColor}`} 
        />
        <span className={`font-sans text-[16px] font-medium leading-[19px] ${getButtonStyle('like', selectedAction === 'like').textColor} ${getButtonStyle('like', selectedAction === 'like').textDisplay}`}>
          {isLiked ? 'Gemerkt' : 'Merken'}
        </span>
      </Button>

      <Button
        variant="share"
        className={`h-[40px] p-2 rounded-[12px] transition-all duration-200 ${
          getButtonStyle('share', selectedAction === 'share').width
        } ${getButtonStyle('share', selectedAction === 'share').background}`}
        onClick={() => handleActionClick('share', onShare)}
      >
        <Share2 className={`w-[20px] h-[20px] ${getButtonStyle('share', selectedAction === 'share').iconColor}`} />
        {selectedAction === 'share' && (
          <span className={`font-sans text-[16px] font-medium leading-[19px] ${getButtonStyle('share', selectedAction === 'share').textColor} ml-2`}>
            Teilen
          </span>
        )}
      </Button>

      <Button
        variant="phone"
        className={`h-[40px] p-2 rounded-[12px] transition-all duration-200 ${
          getButtonStyle('phone', selectedAction === 'phone').width
        } ${getButtonStyle('phone', selectedAction === 'phone').background}`}
        onClick={() => handleActionClick('phone', onPhone)}
      >
        <Phone className={`w-[20px] h-[20px] ${getButtonStyle('phone', selectedAction === 'phone').iconColor}`} />
        {selectedAction === 'phone' && (
          <span className={`font-sans text-[16px] font-medium leading-[19px] ${getButtonStyle('phone', selectedAction === 'phone').textColor} ml-2`}>
            Telefon
          </span>
        )}
      </Button>

      <Button
        variant="website"
        className={`h-[40px] p-2 rounded-[12px] transition-all duration-200 ${
          getButtonStyle('website', selectedAction === 'website').width
        } ${getButtonStyle('website', selectedAction === 'website').background}`}
        onClick={() => handleActionClick('website', onWebsite)}
      >
        <Globe className={`w-[20px] h-[20px] ${getButtonStyle('website', selectedAction === 'website').iconColor}`} />
        {selectedAction === 'website' && (
          <span className={`font-sans text-[16px] font-medium leading-[19px] ${getButtonStyle('website', selectedAction === 'website').textColor} ml-2`}>
            Website
          </span>
        )}
      </Button>
    </div>
  );
};

export default ActionBar; 