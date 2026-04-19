'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export interface ExpandSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * ExpandSection — Reusable expand/collapse card component.
 *
 * Matches the visual pattern from provider detail pages:
 * - Borderless `rounded-2xl` card with `shadow-sm`
 * - Rotating `ChevronDown` icon (no icon swap)
 * - `font-inter-tight font-semibold` title
 *
 * Used on the search page for Was?, Wo, Wer, and Filter accordions.
 */
export function ExpandSection({
  title,
  defaultOpen = false,
  children,
}: ExpandSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl bg-background shadow-sm">
      <button
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between p-4"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="font-inter-tight text-lg font-semibold text-content-heading">
          {title}
        </h3>
        <ChevronDown
          className={`h-6 w-6 text-gray-600 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="border-t border-border-light px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}
