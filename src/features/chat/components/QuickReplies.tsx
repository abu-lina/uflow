'use client';

import { useState } from 'react';

interface QuickRepliesProps {
  options: string[];
  onSelect: (option: string) => void;
  disabled?: boolean;
  singleSelect?: boolean;
}

export function QuickReplies({ options, onSelect, disabled, singleSelect }: QuickRepliesProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  if (!options.length) return null;

  // Detect multi-select mode: options contain "(Ja/Nein)" or are binary choices
  const isMultiSelect =
    !singleSelect &&
    (options.length >= 3 ||
      options.some((o) => o.includes('?') || o.includes('(Ja') || o.includes('Nein')));

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
      .map((i) =>
        options[i]
          .replace(/\s*\(Ja\/Nein\)\s*/g, '') // Remove "(Ja/Nein)" suffix
          .replace(/\?.*$/, '') // Remove question mark and everything after
          .trim(),
      )
      .filter(Boolean)
      .join(', ');
    if (selectedTexts) onSelect(selectedTexts);
  };

  if (isMultiSelect) {
    return (
      <div className="mt-3 flex flex-col gap-2" data-testid="quick-replies">
        <div className="flex flex-wrap gap-2">
          {options.map((option, i) => (
            <button
              key={i}
              className={`rounded-xl border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                selected.has(i)
                  ? 'border-primary bg-primary text-white'
                  : 'border-primary/20 bg-primary/10 text-primary-dark hover:border-primary/30 hover:bg-primary/20'
              }`}
              disabled={disabled}
              type="button"
              onClick={() => toggleOption(i)}
            >
              {option.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')}
            </button>
          ))}
        </div>
        {selected.size > 0 && (
          <button
            className="self-start rounded-xl bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
            disabled={disabled}
            onClick={confirmSelection}
          >
            Bestätigen ({selected.size})
          </button>
        )}
      </div>
    );
  }

  // Single-select mode
  return (
    <div className="mt-3 flex flex-wrap gap-2" data-testid="quick-replies">
      {options.map((option, i) => (
        <button
          key={i}
          className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm text-primary-dark transition-colors hover:border-primary/30 hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          type="button"
          onClick={() => onSelect(option)}
        >
          {option.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')}
        </button>
      ))}
    </div>
  );
}
