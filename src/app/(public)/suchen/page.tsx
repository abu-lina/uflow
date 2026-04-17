'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronDown, ChevronUp, Heart } from 'lucide-react';
import { useLanguage } from '@/providers/LanguageProvider';
import { SectionSelector } from '@/features/search/components/SectionSelector';
import type { Section } from '@/providers/search-provider';

/**
 * Plan 091 M2: /suchen stub page - dedicated search entry point
 *
 * Shell layout with SectionSelector, 4 accordion sections, and bottom bar.
 * No search execution logic - buttons are visual stubs per D3/D4 deferrals.
 *
 * Wraps useSearchParams() in Suspense boundary per F1-A requirement.
 * Back button implements explicit history-check fallback per F1-B (router.back() when history exists, router.push('/') otherwise).
 */

function SuchenPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  // Read section from URL params (default: food)
  const urlSection = (searchParams.get('section') as Section) ?? 'food';
  const [selectedSection, setSelectedSection] = useState<Section>(urlSection);

  // Accordion state - Was? open by default
  const [accordionState, setAccordionState] = useState({
    was: true,
    wo: false,
    wer: false,
    filter: false,
  });

  const toggleAccordion = (key: keyof typeof accordionState) => {
    setAccordionState((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const accordions: Array<{
    key: keyof typeof accordionState;
    label: string;
  }> = [
    { key: 'was', label: t('suchen.accordions.was') },
    { key: 'wo', label: t('suchen.accordions.wo') },
    { key: 'wer', label: t('suchen.accordions.wer') },
    { key: 'filter', label: t('suchen.accordions.filter') },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border-light bg-background">
        <button
          aria-label="Back"
          className="flex items-center gap-2"
          onClick={() => {
            if (window.history.length > 1) {
              router.back();
            } else {
              router.push('/');
            }
          }}
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-state-hover transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-semibold">{t('suchen.title')}</h1>
        </button>
      </header>

      {/* Section Selector */}
      <div className="px-4 py-3">
        <SectionSelector
          selectedSection={selectedSection}
          onSectionChange={setSelectedSection}
        />
      </div>

      {/* Accordions */}
      <div className="flex-1 px-4 py-2 space-y-2">
        {accordions.map(({ key, label }) => {
          const isOpen = accordionState[key];
          return (
            <div key={key} className="border border-border-light rounded-lg overflow-hidden">
              <button
                className="flex items-center justify-between w-full px-4 py-3 bg-surface hover:bg-state-hover transition-colors"
                onClick={() => toggleAccordion(key)}
              >
                <span className="font-medium">{label}</span>
                {isOpen ? (
                  <ChevronUp className="w-5 h-5 text-neutral-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-neutral-500" />
                )}
              </button>
              {isOpen && (
                <div className="px-4 py-3 bg-background border-t border-border-light">
                  <p className="text-sm text-text-muted">
                    {/* Stub - no content per M2 spec */}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Fixed Bottom Bar */}
      <div className="sticky bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-background border-t border-border-light">
        <button
          className="text-sm text-primary font-medium hover:underline"
          onClick={() => {
            // No-op per D4 deferral
          }}
        >
          {t('suchen.clearAll')}
        </button>
        <button
          className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
          onClick={() => {
            // No-op per D4 deferral
          }}
        >
          <Heart className="w-4 h-4" />
          <span>{t('suchen.searchButton')}</span>
        </button>
      </div>
    </div>
  );
}

export default function SuchenPage() {
  return (
    <Suspense fallback={null}>
      <SuchenPageContent />
    </Suspense>
  );
}
