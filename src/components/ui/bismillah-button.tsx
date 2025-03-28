import { ButtonHTMLAttributes } from 'react';

interface BismillahButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  className?: string;
}

export function BismillahButton({ 
  isActive = true, 
  className = '', 
  ...props 
}: BismillahButtonProps) {
  return (
    <button
      {...props}
      className={`w-[263px] h-[40px] rounded-[15px] flex items-center justify-center text-[17.54px] font-medium leading-[31px] tracking-[0.153846px] shadow-[0px_6.15385px_12.3077px_4.61538px_rgba(0,0,0,0.15),0px_1.53846px_4.61538px_rgba(0,0,0,0.3)] ${
        isActive
          ? 'bg-[#BFDBD8] text-[#232323] hover:bg-[#A8C9C5]'
          : 'bg-[#EEEEEE] text-[#CDCDCD] cursor-not-allowed'
      } ${className}`}
    >
      Bismillah
    </button>
  );
} 