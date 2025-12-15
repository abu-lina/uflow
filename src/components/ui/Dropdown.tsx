import { useEffect, useRef, useState } from 'react';

import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

interface DropdownProps {
  className?: string;
  items: string[];
  onChange: (value: string) => void;
  value: string;
}

export function Dropdown({ className, items, onChange, value }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          'hover:bg-muted flex flex-row items-center gap-2 rounded-md px-2 py-1',
          className,
        )}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-base font-normal leading-[19px] text-content">{value}</span>
        <ChevronDown
          className={cn('h-6 w-6 -rotate-90 transition-transform', {
            'rotate-0': isOpen,
          })}
        />
      </button>
      {isOpen && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border bg-white shadow-lg"
          role="listbox"
        >
          {items.map((item) => (
            <button
              key={item}
              aria-selected={item === value}
              className={cn(
                'hover:bg-muted w-full px-4 py-2 text-left text-base font-normal leading-[19px]',
                {
                  'bg-muted': item === value,
                },
              )}
              role="option"
              type="button"
              onClick={() => {
                onChange(item);
                setIsOpen(false);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
