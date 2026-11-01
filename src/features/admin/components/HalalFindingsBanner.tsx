'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { useLanguage } from '@/providers/LanguageProvider';

const HALAL_FIELDS = new Set(['no_alcohol', 'no_pork']);

interface HalalFindingsBannerProps {
  providerId: string;
}

/** ADR 0003: points the reviewer at pending halal pipeline findings. Silent on load errors. */
export function HalalFindingsBanner({ providerId }: HalalFindingsBannerProps) {
  const { t } = useLanguage();
  const [hasFindings, setHasFindings] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ providerId, limit: '100' });
    fetch(`/api/admin/enrichment/candidates?${params}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const items: { field_name?: string }[] = json?.data ?? [];
        if (!cancelled) setHasFindings(items.some((c) => HALAL_FIELDS.has(c.field_name ?? '')));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [providerId]);

  if (!hasFindings) return null;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900"
      role="status"
    >
      <span>{t('adminHalalEdit.findingsBanner.text')}</span>
      <Link
        className="font-medium underline"
        href={`/dashboard/providers/${providerId}/edit/enrichment`}
      >
        {t('adminHalalEdit.findingsBanner.link')}
      </Link>
    </div>
  );
}
