'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { useLanguage } from '@/providers/LanguageProvider';
import type { ReadyForReviewProvider } from '@/services/admin/providers';

type PaginatedResponse = {
  data: ReadyForReviewProvider[];
  pagination: { total: number; limit: number; offset: number; hasMore: boolean };
};

const STATUS_STYLES: Record<string, string> = {
  flagged: 'border-red-300 bg-red-100 text-red-900',
  review: 'border-amber-300 bg-amber-100 text-amber-900',
  clear: 'border-green-300 bg-green-100 text-green-900',
};

function safeHref(url: string): string | null {
  try {
    const { protocol } = new URL(url);
    return protocol === 'https:' || protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

/** Admin queue: providers that passed enrichment and screening — ready for final review. */
export function ProviderReviewQueue() {
  const { t } = useLanguage();
  const [items, setItems] = useState<ReadyForReviewProvider[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ id: string; msg: string } | null>(null);

  const load = useCallback(async (nextOffset: number, append: boolean) => {
    try {
      const params = new URLSearchParams({ limit: '50', offset: String(nextOffset) });
      const res = await fetch(`/api/admin/providers/review-queue?${params}`);
      if (!res.ok) throw new Error('load failed');
      const json: PaginatedResponse = await res.json();
      setItems((prev) => (append ? [...(prev ?? []), ...json.data] : json.data));
      setHasMore(json.pagination.hasMore);
      setOffset(nextOffset + json.data.length);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    load(0, false);
  }, [load]);

  const approve = useCallback(async (item: ReadyForReviewProvider) => {
    setBusyId(item.provider_id);
    setActionError(null);
    try {
      const res = await fetch('/api/admin/review-provider', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: item.provider_id, reviewStatus: 'approved' }),
      });
      if (res.status === 422) {
        setActionError({ id: item.provider_id, msg: 'providerReview.halalGate' });
        return;
      }
      if (!res.ok) throw new Error('approve failed');
      setItems((prev) => (prev ?? []).filter((i) => i.provider_id !== item.provider_id));
      setExpandedId(null);
    } catch {
      setActionError({ id: item.provider_id, msg: 'providerReview.actionError' });
    } finally {
      setBusyId(null);
    }
  }, []);

  const submitReject = useCallback(
    async (item: ReadyForReviewProvider) => {
      if (!rejectFeedback.trim()) return;
      setBusyId(item.provider_id);
      setActionError(null);
      try {
        const res = await fetch('/api/admin/review-provider', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId: item.provider_id,
            reviewStatus: 'rejected',
            reviewFeedback: rejectFeedback.trim(),
          }),
        });
        if (!res.ok) throw new Error('reject failed');
        setItems((prev) => (prev ?? []).filter((i) => i.provider_id !== item.provider_id));
        setExpandedId(null);
        setRejectingId(null);
        setRejectFeedback('');
      } catch {
        setActionError({ id: item.provider_id, msg: 'providerReview.actionError' });
      } finally {
        setBusyId(null);
      }
    },
    [rejectFeedback],
  );

  if (loadFailed) return <p role="alert">{t('providerReview.loadError')}</p>;
  if (items === null) return <p role="status">{t('providerReview.loading')}</p>;
  if (items.length === 0) return <p>{t('providerReview.empty')}</p>;

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {items.map((item) => {
          const expanded = expandedId === item.provider_id;
          const rejecting = rejectingId === item.provider_id;
          const busy = busyId === item.provider_id;
          const err = actionError?.id === item.provider_id ? actionError.msg : null;
          const statusStyle = STATUS_STYLES[item.screening_status ?? ''] ?? STATUS_STYLES.clear;

          return (
            <li key={item.provider_id} className="rounded-lg border border-gray-200 bg-white">
              <button
                aria-expanded={expanded}
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-start"
                type="button"
                onClick={() => {
                  setExpandedId(expanded ? null : item.provider_id);
                  setRejectingId(null);
                  setRejectFeedback('');
                  setActionError(null);
                }}
              >
                <span className="font-medium">{item.provider_name}</span>
                <span className="text-sm text-gray-500">{item.address_city}</span>
                <span className="text-xs text-gray-400">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
                <span className={`rounded border px-2 py-0.5 text-xs font-medium ${statusStyle}`}>
                  {t(`adminScreening.status.${item.screening_status ?? 'clear'}`)}
                </span>
              </button>

              {expanded && (
                <div className="space-y-4 border-t border-gray-100 px-4 py-3 text-sm">
                  {/* Screening flags */}
                  {item.screening_flags.length > 0 && (
                    <section>
                      <h3 className="mb-2 font-medium">{t('providerReview.screeningFlags')}</h3>
                      <ul className="space-y-2">
                        {item.screening_flags.map((flag, i) => {
                          const href = safeHref(flag.url);
                          return (
                            <li
                              key={`${flag.code}-${i}`}
                              className="rounded border border-neutral-200 bg-neutral-50 p-2 text-xs"
                            >
                              <span className="font-semibold">{flag.code}</span>
                              {flag.term && (
                                <span className="ml-2 text-neutral-600">{flag.term}</span>
                              )}
                              {flag.snippet && (
                                <p className="mt-1 text-neutral-500">{flag.snippet}</p>
                              )}
                              {href && (
                                <a
                                  className="mt-1 block break-all text-blue-700 underline"
                                  href={href}
                                  rel="noopener noreferrer"
                                  target="_blank"
                                >
                                  {href}
                                </a>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  )}

                  {/* Applied enrichment links */}
                  {item.enrichment_links.length > 0 && (
                    <section>
                      <h3 className="mb-2 font-medium">{t('providerReview.enrichmentLinks')}</h3>
                      <ul className="flex flex-wrap gap-2">
                        {item.enrichment_links.map((link, i) => (
                          <li key={i}>
                            <a
                              className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-800 underline"
                              href={link.url}
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              {link.platform}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* Halal findings */}
                  {item.halal_pending && (
                    <p className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                      {t('providerReview.halalPendingNote')}{' '}
                      <Link className="underline" href="/dashboard/halal-review">
                        {t('providerReview.halalReviewLink')}
                      </Link>
                    </p>
                  )}

                  {/* Error message */}
                  {err && (
                    <p className="text-xs text-red-600">
                      {t(err)}{' '}
                      {err === 'providerReview.halalGate' && (
                        <Link className="underline" href="/dashboard/halal-review">
                          {t('providerReview.halalReviewLink')}
                        </Link>
                      )}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {!rejecting ? (
                      <div className="flex gap-2">
                        <button
                          className="rounded bg-green-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                          disabled={busy}
                          type="button"
                          onClick={() => approve(item)}
                        >
                          {t('providerReview.approve')}
                        </button>
                        <button
                          className="rounded bg-red-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                          disabled={busy}
                          type="button"
                          onClick={() => {
                            setRejectingId(item.provider_id);
                            setRejectFeedback('');
                          }}
                        >
                          {t('providerReview.reject')}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <textarea
                          className="w-full rounded border border-gray-300 p-2 text-sm"
                          placeholder={t('providerReview.rejectPlaceholder')}
                          rows={3}
                          value={rejectFeedback}
                          onChange={(e) => setRejectFeedback(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            className="rounded bg-red-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                            disabled={busy || !rejectFeedback.trim()}
                            type="button"
                            onClick={() => submitReject(item)}
                          >
                            {t('providerReview.submitReject')}
                          </button>
                          <button
                            className="rounded border border-gray-300 px-4 py-1.5 text-sm text-gray-700"
                            type="button"
                            onClick={() => {
                              setRejectingId(null);
                              setRejectFeedback('');
                            }}
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {hasMore && (
        <button
          className="mt-4 w-full rounded border border-gray-300 py-2 text-sm text-gray-700"
          type="button"
          onClick={() => load(offset, true)}
        >
          {t('providerReview.loadMore')}
        </button>
      )}
    </div>
  );
}
