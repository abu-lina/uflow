'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useLanguage } from '@/providers/LanguageProvider';
import type { Section } from '@/providers/search-provider';
import { SECTION_ICON_RENDERERS } from '@/features/search/constants/sectionIconRenderers';

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

  const resolvedLocation = location && location.trim() ? location : everywhereLabel;
  const renderIcon = SECTION_ICON_RENDERERS[section];

  return (
    <div
      className={`flex items-center justify-between rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 shadow-sm ${className}`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
        {renderIcon(true)}
      </div>

      <div className="mx-2 min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1 text-left text-sm font-medium text-[#585858]">
          <span className="truncate">{resolvedSearchTerm}</span>
          <span aria-hidden="true">•</span>
          <span className="truncate">{resolvedLocation}</span>
          {peopleSummary?.trim() ? (
            <>
              <span aria-hidden="true">•</span>
              <span className="truncate">{peopleSummary}</span>
            </>
          ) : null}
        </div>
      </div>

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
