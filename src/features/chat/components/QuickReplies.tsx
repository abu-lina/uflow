'use client';

import { useState } from 'react';

interface QuickRepliesProps {
  options: string[];
  onSelect: (option: string) => void;
  disabled?: boolean;
}

export function QuickReplies({ options, onSelect, disabled }: QuickRepliesProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  if (!options.length) return null;

  // Detect multi-select mode: options contain "(Ja/Nein)" or are binary choices
  const isMultiSelect = options.some(o => o.includes('?') || o.includes('(Ja') || o.includes('Nein'));

  const toggleOption = (index: number) => {
    const next = new Set(selected);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelected(next);
  };

  const confirmSelection = () => {
    const selectedTexts = Array.from(selected)
      .map(i => options[i])
      .join(', ');
    if (selectedTexts) onSelect(selectedTexts);
  };

  if (isMultiSelect) {
    return (
      <div className="flex flex-col gap-2 mt-3" data-testid="quick-replies">
        <div className="flex flex-wrap gap-2">
          {options.map((option, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleOption(i)}
              disabled={disabled}
              className={`px-3 py-1.5 text-sm border rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                selected.has(i)
                  ? 'bg-primary text-white border-primary'
                  : 'bg-primary/10 text-primary-dark border-primary/20 hover:bg-primary/20 hover:border-primary/30'
              }`}
            >
              {option.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')}
            </button>
          ))}
        </div>
        {selected.size > 0 && (
          <button
            onClick={confirmSelection}
            disabled={disabled}
            className="self-start px-4 py-1.5 text-sm font-medium bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors"
          >
            Bestätigen ({selected.size})
          </button>
        )}
      </div>
    );
  }

  // Single-select mode
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
