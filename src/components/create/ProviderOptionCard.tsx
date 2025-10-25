import React from 'react';
import { ProviderIcon } from '@/components/ui/ProviderIcon';
import { Button } from '@/components/ui/Button';

interface ProviderOptionCardProps {
  variant: 'store' | 'recommend';
  title: string;
  description: string;
  buttonText: string;
  onClick: () => void;
}

export function ProviderOptionCard({
  variant,
  title,
  description,
  buttonText,
  onClick,
}: ProviderOptionCardProps) {
  return (
    <article className="flex flex-col justify-center items-center p-6 gap-6 w-full h-[200px] bg-white border border-[#D4D4D4] rounded-2xl shadow-sm hover:shadow-lg hover:border-teal-500 transition-all duration-300">
      {/* Content: Icon + Title + Description */}
      <div className="flex flex-row items-center gap-6 w-full">
        <ProviderIcon variant={variant} />
        
        <div className="flex flex-col items-start gap-2 flex-1">
          <h2 className="font-medium text-lg leading-6 text-[#232323]">
            {title}
          </h2>
          <p className="font-normal text-sm leading-4 tracking-[0.15px] text-[#272727]">
            {description}
          </p>
        </div>
      </div>
      
      {/* Action Button */}
      <Button
        fullWidth
        size="md"
        type="button"
        variant="action"
        onClick={onClick}
      >
        {buttonText}
      </Button>
    </article>
  );
}

