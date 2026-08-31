import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type InfoTrailingProps =
  | {
      onPress: () => void;
      ariaLabel: string;
      className?: string;
    }
  | {
      onPress?: undefined;
      ariaLabel?: undefined;
      className?: string;
    };

export function InfoTrailing({ onPress, ariaLabel, className }: InfoTrailingProps) {
  const content = <Info aria-hidden="true" className="h-3 w-3 text-[#7a7a7a]" />;

  if (onPress) {
    return (
      <button
        aria-label={ariaLabel}
        className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e9e9e9]', className)}
        type="button"
        onClick={onPress}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e9e9e9]', className)}
      data-testid="info-trailing-static"
    >
      {content}
    </span>
  );
}
