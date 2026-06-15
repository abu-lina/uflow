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
          className="px-3 py-1.5 text-sm bg-primary/10 text-primary-dark border border-primary/20 rounded-xl hover:bg-primary/20 hover:border-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {option.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')}
        </button>
      ))}
    </div>
  );
}
