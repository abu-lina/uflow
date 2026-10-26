'use client';

import { useId } from 'react';

import { Skeleton } from '@/components/ui/skeleton/Skeleton';
import { useLanguage } from '@/providers/LanguageProvider';
import type { ProviderScreeningsResult } from '@/features/admin/utils/provider-screenings';
import type { ScreeningFlag, ScreeningStatus } from '@/types/providerScreening';

const STATUS_STYLES: Record<ScreeningStatus, string> = {
  flagged: 'border-red-300 bg-red-100 text-red-900',
  review: 'border-amber-300 bg-amber-100 text-amber-900',
  clear: 'border-green-300 bg-green-100 text-green-900',
};

// Only http(s) evidence is linked; anything else (javascript:, data:) stays plain text.
function safeHref(url: string): string | null {
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

function FlagList({
  flags,
  testId,
  t,
}: {
  flags: ScreeningFlag[];
  testId: string;
  t: (key: string) => string;
}) {
  return (
    <ul className="space-y-3">
      {flags.map((flag, i) => {
        const href = safeHref(flag.url);
        return (
          <li
            key={`${flag.code}-${flag.term}-${flag.url}-${i}`}
            className="rounded-lg border border-neutral-200 bg-white p-3 text-sm"
            data-testid={testId}
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-semibold">{t(`adminScreening.code.${flag.code}`)}</span>
              <span className="text-neutral-600">{t(`adminScreening.source.${flag.source}`)}</span>
            </div>
            {flag.term ? (
              <p className="mt-1 break-words">
                <span className="text-neutral-600">{t('adminScreening.matchedTerm')}: </span>
                <span className="font-medium">{flag.term}</span>
              </p>
            ) : null}
            {flag.snippet ? (
              <blockquote className="mt-1 break-words text-neutral-700">{flag.snippet}</blockquote>
            ) : null}
            {href ? (
              <a
                className="mt-2 inline-block break-all text-blue-700 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                href={href}
                rel="noopener noreferrer"
                target="_blank"
              >
                {t('adminScreening.openEvidence')}
              </a>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function ProviderScreeningPanelSkeleton() {
  return (
    <div className="space-y-3 border-b border-neutral-200 px-6 py-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

export function ProviderScreeningPanel({ result }: { result: ProviderScreeningsResult }) {
  const { t } = useLanguage();
  const headingId = useId();

  if (result.state === 'forbidden') return null;

  return (
    <section
      aria-labelledby={headingId}
      className="border-b border-neutral-200 bg-white px-4 py-4 sm:px-6"
    >
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-base font-semibold" id={headingId}>
            {t('adminScreening.title')}
          </h2>
          {result.state === 'ready' ? (
            <span
              className={`rounded-full border px-3 py-1 text-sm font-medium ${STATUS_STYLES[result.status]}`}
              data-status={result.status}
              data-testid="screening-status"
            >
              {t(`adminScreening.status.${result.status}`)}
            </span>
          ) : null}
        </div>

        {result.state === 'empty' ? (
          <p className="text-sm text-neutral-700">{t('adminScreening.empty')}</p>
        ) : null}

        {result.state === 'error' ? (
          <p className="text-sm text-red-800" role="alert">
            {t('adminScreening.error')}
          </p>
        ) : null}

        {result.state === 'ready' ? (
          <>
            <div data-testid="screening-risks">
              <h3 className="mb-2 text-sm font-semibold">{t('adminScreening.risksHeading')}</h3>
              {result.risks.length > 0 ? (
                <FlagList flags={result.risks} t={t} testId="screening-risk-flag" />
              ) : (
                <p className="text-sm text-neutral-700">{t('adminScreening.noRisks')}</p>
              )}
            </div>
            {result.suggestNoAlcohol ? (
              <p
                className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"
                data-testid="screening-no-alcohol-suggestion"
              >
                {t('adminScreening.noAlcoholSuggestion')}
              </p>
            ) : null}
            {result.positives.length > 0 ? (
              <div data-testid="screening-positives">
                <h3 className="text-sm font-semibold">{t('adminScreening.positivesHeading')}</h3>
                <p className="mb-2 text-xs text-neutral-600">{t('adminScreening.positivesNote')}</p>
                <FlagList flags={result.positives} t={t} testId="screening-positive-flag" />
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
