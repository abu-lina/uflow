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
    <article className="flex min-h-[160px] w-full flex-col items-center justify-center gap-4 rounded-2xl border border-[#D4D4D4] bg-white p-4 shadow-sm transition-all duration-300 hover:border-teal-500 hover:shadow-lg sm:min-h-[180px] sm:gap-6 sm:p-6">
      {/* Content: Icon + Title + Description */}
      <div className="flex w-full flex-row items-center gap-3 sm:gap-6">
        <ProviderIcon variant={variant} />

        <div className="flex flex-1 flex-col items-start gap-1.5 sm:gap-2">
          <h2 className="text-base font-medium leading-5 text-[#232323] sm:text-lg sm:leading-6">
            {title}
          </h2>
          <p className="leading-3.5 text-xs font-normal tracking-[0.15px] text-[#272727] sm:text-sm sm:leading-4">
            {description}
          </p>
        </div>
      </div>

      {/* Action Button */}
      <Button fullWidth size="md" type="button" variant="action" onClick={onClick}>
        {buttonText}
      </Button>
    </article>
  );
}
