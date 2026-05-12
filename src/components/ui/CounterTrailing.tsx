import { cn } from '@/lib/utils';

interface CounterTrailingProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
  max?: number;
  className?: string;
  incrementAriaLabel?: string;
  decrementAriaLabel?: string;
}

function MinusIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3 text-text-muted"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M5 12h14" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-3 text-text-muted"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function CounterTrailing({
  value,
  onIncrement,
  onDecrement,
  min = 0,
  max,
  className,
  incrementAriaLabel = '+',
  decrementAriaLabel = '-',
}: CounterTrailingProps) {
  const decrementDisabled = value <= min;
  const incrementDisabled = max !== undefined ? value >= max : false;

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <button
        aria-label={decrementAriaLabel}
        className="flex size-6 items-center justify-center rounded-full bg-[#e9e9e9] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60"
        disabled={decrementDisabled}
        type="button"
        onClick={onDecrement}
      >
        <MinusIcon />
      </button>

      <p className="min-w-[12px] text-center font-inter-tight text-base font-medium text-text-primary">{value}</p>

      <button
        aria-label={incrementAriaLabel}
        className="flex size-6 items-center justify-center rounded-full bg-[#e9e9e9] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60"
        disabled={incrementDisabled}
        type="button"
        onClick={onIncrement}
      >
        <PlusIcon />
      </button>
    </div>
  );
}
