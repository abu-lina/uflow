'use client';

import { ChevronLeft, SlidersHorizontal, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useLanguage } from '@/providers/LanguageProvider';
import type { Section } from '@/providers/search-provider';

interface SearchContextBarProps {
  section: Section;
  searchTerm?: string | null;
  categoryId?: string | null;
  categoryLabel?: string | null;
  location?: string | null;
  peopleSummary?: string | null;
  className?: string;
}

export function SearchContextBar({
  section,
  searchTerm,
  categoryId,
  categoryLabel,
  location,
  peopleSummary,
  className = '',
}: SearchContextBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const sectionLabel =
    section === 'food' ? t('sections.food') : section === 'ummah' ? t('sections.ummah') : t('sections.stores');

  const allResultsKey = 'search.context.allResults';
  const allResultsLabelCandidate = t(allResultsKey);
  const allResultsLabel = allResultsLabelCandidate === allResultsKey ? sectionLabel : allResultsLabelCandidate;

  const editKey = 'search.context.edit';
  const editLabelCandidate = t(editKey);
  const editLabel = editLabelCandidate === editKey ? 'Edit search' : editLabelCandidate;

  const everywhereKey = 'search.everywhere';
  const everywhereLabelCandidate = t(everywhereKey);
  const everywhereLabel = everywhereLabelCandidate === everywhereKey ? 'Everywhere' : everywhereLabelCandidate;

  const resolvedSearchTerm =
    searchTerm?.trim() || (categoryId ? categoryLabel?.trim() || sectionLabel : allResultsLabel);
  const [draftQuery, setDraftQuery] = useState(searchTerm?.trim() ?? '');

  useEffect(() => {
    setDraftQuery(searchTerm?.trim() ?? '');
  }, [searchTerm]);

  const resolvedLocation = location && location.trim() ? location : everywhereLabel;
  const resolvedLocationValue = location && location.trim() ? location.trim() : '';
  const backHomeLabel = t('search.context.backToHome');

  const navigateWithQuery = (nextQuery: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', section);

    const trimmed = nextQuery.trim();
    if (trimmed) {
      params.set('q', trimmed);
    } else {
      params.delete('q');
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(nextUrl);
  };

  const handleQuerySubmit = () => {
    navigateWithQuery(draftQuery);
  };

  const handleQueryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleQuerySubmit();
    }
  };

  const handleClearQuery = () => {
    setDraftQuery('');
    navigateWithQuery('');
  };

  const handleLocationChange = (nextLocation: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', section);

    if (nextLocation) {
      params.set('location', nextLocation);
    } else {
      params.delete('location');
    }

    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(nextUrl);
  };

  return (
    <div
      className={`flex items-center justify-between rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 shadow-sm ${className}`}
    >
      <button
        aria-label={backHomeLabel}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-neutral-100 text-content-heading transition-colors hover:bg-neutral-200"
        type="button"
        onClick={() => router.push('/')}
      >
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
      </button>

      <div className="mx-2 min-w-0 flex-1">
        <div className="flex min-w-0 items-center text-left text-sm font-medium text-[#585858]">
          <div className="flex min-w-0 flex-1 items-center">
            <input
              aria-label={t('search.ariaLabel')}
              className="min-w-0 flex-1 border-0 bg-transparent text-left text-sm font-medium text-[#585858] outline-none ring-0 placeholder:text-[#8a8a8a] focus:outline-none focus:ring-0"
              placeholder={resolvedSearchTerm}
              type="search"
              value={draftQuery}
              onChange={(e) => setDraftQuery(e.target.value)}
              onKeyDown={handleQueryKeyDown}
            />

            {draftQuery.trim() ? (
              <button
                aria-label={t('suchen.clearAll')}
                className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#585858] transition-opacity hover:opacity-70"
                type="button"
                onClick={handleClearQuery}
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <span aria-hidden="true" className="mx-2 h-5 w-px shrink-0 bg-gray-300" />

          <select
            aria-label={t('search.filter')}
            className="max-w-28 border-0 bg-transparent text-sm font-medium text-[#8a8a8a] outline-none ring-0 focus:outline-none focus:ring-0"
            value={resolvedLocationValue}
            onChange={(e) => handleLocationChange(e.target.value)}
          >
            {resolvedLocationValue ? <option value={resolvedLocationValue}>{resolvedLocation}</option> : null}
            <option value="">{everywhereLabel}</option>
          </select>

          {peopleSummary?.trim() ? (
            <>
              <span aria-hidden="true" className="mx-2 h-5 w-px shrink-0 bg-gray-300" />
              <span className="truncate text-[#8a8a8a]">{peopleSummary}</span>
            </>
          ) : null}
        </div>
      </div>

      <span aria-hidden="true" className="mr-1 h-5 w-px shrink-0 bg-gray-300" />

      <button
        aria-label={editLabel}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#585858] transition-opacity hover:opacity-70"
        type="button"
        onClick={() => router.push(`/search?section=${section}`)}
      >
        <SlidersHorizontal aria-hidden="true" className="h-5 w-5" />
      </button>
    </div>
  );
}
