'use client';

import { useCallback, useEffect, useState } from 'react';

import type { HalalReviewItem, HalalToggles } from '@/services/admin/halalReviewQueue';
import { useLanguage } from '@/providers/LanguageProvider';

const TOGGLES: { field: keyof HalalToggles; labelKey: string }[] = [
  { field: 'no_alcohol', labelKey: 'halalReview.noAlcohol' },
  { field: 'no_pork', labelKey: 'halalReview.noPork' },
  { field: 'no_gambling', labelKey: 'halalReview.noGambling' },
];

/** Admin queue: one row per provider with pending halal findings, confirmed in place. */
export function HalalReviewQueue() {
  const { t } = useLanguage();
  const [items, setItems] = useState<HalalReviewItem[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toggles, setToggles] = useState<Record<string, HalalToggles>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/halal-review')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('load failed'))))
      .then((json) => {
        if (!cancelled) setItems(json.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const confirm = useCallback(
    async (item: HalalReviewItem) => {
      const values = toggles[item.providerId] ?? item.toggles;
      setBusyId(item.providerId);
      setConfirmError(false);
      try {
        const res = await fetch('/api/admin/halal-review/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ providerId: item.providerId, ...values }),
        });
        if (!res.ok) throw new Error('confirm failed');
        setItems((prev) => (prev ?? []).filter((i) => i.providerId !== item.providerId));
        setExpandedId(null);
      } catch {
        setConfirmError(true);
      } finally {
        setBusyId(null);
      }
    },
    [toggles],
  );

  if (loadFailed) return <p role="alert">{t('halalReview.loadError')}</p>;
  if (items === null) return <p role="status">{t('halalReview.loading')}</p>;
  if (items.length === 0) return <p>{t('halalReview.empty')}</p>;

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const expanded = expandedId === item.providerId;
        const values = toggles[item.providerId] ?? item.toggles;
        return (
          <li key={item.providerId} className="rounded-lg border border-gray-200 bg-white">
            <button
              aria-expanded={expanded}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-start"
              type="button"
              onClick={() => {
                setExpandedId(expanded ? null : item.providerId);
                setConfirmError(false);
              }}
            >
              <span className="font-medium">{item.providerName}</span>
              <span className="text-xs text-gray-500">
                {new Date(item.oldestPendingAt).toLocaleDateString()}
              </span>
            </button>

            {expanded && (
              <div className="space-y-4 border-t border-gray-100 px-4 py-3 text-sm">
                <section>
                  <h3 className="font-medium">{t('halalReview.mapsMatch')}</h3>
                  {item.mapsMatch ? (
                    <a
                      className="underline"
                      href={item.mapsMatch.url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {item.mapsMatch.category ?? t('halalReview.openMaps')}
                    </a>
                  ) : (
                    <p>{t('halalReview.none')}</p>
                  )}
                </section>

                <section>
                  <h3 className="font-medium">{t('halalReview.deliveryLinks')}</h3>
                  {item.deliveryLinks.length > 0 ? (
                    <ul className="flex flex-wrap gap-3">
                      {item.deliveryLinks.map((link) => (
                        <li key={link.platform}>
                          <a
                            className="underline"
                            href={link.url}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            {link.platform}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>{t('halalReview.none')}</p>
                  )}
                </section>

                <section>
                  <h3 className="font-medium">{t('halalReview.flaggedItems')}</h3>
                  {item.flaggedItems.length > 0 ? (
                    <ul className="space-y-1">
                      {item.flaggedItems.map((flag) => (
                        <li key={`${flag.substance}:${flag.name}`}>
                          <mark className="rounded bg-red-100 px-1 text-red-900">{flag.name}</mark>{' '}
                          <span className="text-gray-500">({flag.substance})</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>{t('halalReview.none')}</p>
                  )}
                </section>

                <div className="space-y-2">
                  {TOGGLES.map(({ field, labelKey }) => (
                    <label key={field} className="flex items-center gap-2">
                      <input
                        checked={values[field]}
                        type="checkbox"
                        onChange={(e) =>
                          setToggles((prev) => ({
                            ...prev,
                            [item.providerId]: { ...values, [field]: e.target.checked },
                          }))
                        }
                      />
                      {t(labelKey)}
                    </label>
                  ))}
                </div>

                {confirmError && <p role="alert">{t('halalReview.confirmError')}</p>}
                <button
                  className="rounded-lg bg-green-700 px-4 py-2 text-white disabled:opacity-50"
                  disabled={busyId === item.providerId}
                  type="button"
                  onClick={() => confirm(item)}
                >
                  {t('halalReview.confirm')}
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
