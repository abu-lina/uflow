'use client';

interface QuickRepliesProps {
  options: string[];
  onSelect: (option: string) => void;
  disabled?: boolean;
}

export function QuickReplies({ options, onSelect, disabled }: QuickRepliesProps) {
  if (!options.length) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3" data-testid="quick-replies">
      {options.map((option, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(option)}
          disabled={disabled}
          className="px-3 py-1.5 text-sm bg-teal-50 text-teal-700 border border-teal-200 rounded-full hover:bg-teal-100 hover:border-teal-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
