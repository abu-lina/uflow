import { PageSliderIcon } from '@/components/ui/PageSliderIcon';

interface PageSliderIndicatorProps {
  count: number;
  activeIndex: number;
  className?: string;
  onChange?: (index: number) => void;
}

export function PageSliderIndicator({
  count,
  activeIndex,
  className,
  onChange,
}: PageSliderIndicatorProps) {
  return (
    <div aria-label="Seitenanzeige" className={`flex items-center gap-4 ${className ?? ''}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <button
          key={idx}
          aria-label={`Seite ${idx + 1}`}
          className="h-3 w-3 focus:outline-none"
          type="button"
          onClick={() => onChange?.(idx)}
        >
          <PageSliderIcon fill={idx === activeIndex ? '#589D96' : '#CDCDCD'} />
        </button>
      ))}
    </div>
  );
}
