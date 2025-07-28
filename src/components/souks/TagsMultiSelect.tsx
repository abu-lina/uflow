'use client';

import { useEffect, useRef, useState } from 'react';

interface TagsMultiSelectProps {
  selected: string[];
  onChange: (tags: string[]) => void;
  error?: string;
  required?: boolean;
}

const TAGS = [
  'Halal',
  'Familienfreundlich',
  'Moschee-nah',
  'Frauenfreundlich',
  'Bio',
  'Vegan',
  'Kultur',
  'Bildung',
  'Shopping',
  'Dienstleistung',
  'Lebensmittel',
  'Restaurant',
  'Café',
  'Event',
  'Kinder',
  'Sport',
  'Reisen',
  'Mode',
  'Handwerk',
  'Sonstiges',
] as const;

export function TagsMultiSelect({ selected, onChange, error, required }: TagsMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setOpen(true);
        setFocusedIndex((prev) => (prev < TAGS.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0) {
          const tag = TAGS[focusedIndex];
          onChange(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag]);
        }
        break;
      case 'Escape':
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className="w-full">
      <label className="font-inter text-base text-[#999999]">
        TAGS
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <div className="relative mt-2">
        <button
          ref={buttonRef}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label="Tags auswählen"
          className={`h-10 w-full rounded-[15px] border ${error ? 'border-red-500' : 'border-[#D4D4D4]'} bg-white px-4 text-left font-inter text-[15px] text-[#272727] outline-none transition-colors focus:border-[#272727] focus:ring-1 focus:ring-[#272727]`}
          type="button"
          onClick={() => setOpen((v) => !v)}
          onKeyDown={handleKeyDown}
        >
          {selected.length > 0 ? selected.join(', ') : 'Tags auswählen'}
        </button>
        {open && (
          <div
            className="hide-scrollbar absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-[15px] border border-[#D4D4D4] bg-white shadow-lg"
            role="listbox"
          >
            {TAGS.map((tag, index) => (
              <label
                key={tag}
                className={`flex cursor-pointer items-center gap-2 px-4 py-2 hover:bg-gray-100 ${
                  index === focusedIndex ? 'bg-gray-100' : ''
                }`}
              >
                <input
                  checked={selected.includes(tag)}
                  className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                  type="checkbox"
                  onChange={() => {
                    onChange(
                      selected.includes(tag)
                        ? selected.filter((t) => t !== tag)
                        : [...selected, tag],
                    );
                  }}
                />
                <span className="font-inter text-[15px] text-[#272727]">{tag}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
