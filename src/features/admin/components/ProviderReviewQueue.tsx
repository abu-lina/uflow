'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/providers/LanguageProvider';
import type { ReadyForReviewProvider } from '@/services/admin/providers';

type PaginatedResponse = {
  data: ReadyForReviewProvider[];
  pagination: { total: number; limit: number; offset: number; hasMore: boolean };
};

const STATUS_STYLES: Record<string, string> = {
  flagged: 'border-red-300 bg-red-50 text-red-900',
  review: 'border-amber-300 bg-amber-50 text-amber-900',
  clear: 'border-green-300 bg-green-50 text-green-900',
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

  if (loadFailed)
    return (
      <p className="text-sm text-red-800" role="alert">
        {t('providerReview.loadError')}
      </p>
    );
  if (items === null)
    return (
      <p className="text-sm text-content-muted" role="status">
        {t('providerReview.loading')}
      </p>
    );
  if (items.length === 0)
    return <p className="text-sm text-content-muted">{t('providerReview.empty')}</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-3">
      <ul className="space-y-3">
        {items.map((item) => {
          const expanded = expandedId === item.provider_id;
          const rejecting = rejectingId === item.provider_id;
          const busy = busyId === item.provider_id;
          const err = actionError?.id === item.provider_id ? actionError.msg : null;
          const statusStyle = STATUS_STYLES[item.screening_status ?? ''] ?? STATUS_STYLES.clear;

          return (
            <li
              key={item.provider_id}
              className="rounded-xl border border-neutral-200 bg-white shadow-sm"
            >
              {/* Row header — always visible */}
              <button
                aria-expanded={expanded}
                className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-start sm:flex-nowrap"
                type="button"
                onClick={() => {
                  setExpandedId(expanded ? null : item.provider_id);
                  setRejectingId(null);
                  setRejectFeedback('');
                  setActionError(null);
                }}
              >
                <span className="min-w-0 flex-1 truncate font-inter-tight text-base font-semibold text-content-heading">
                  {item.provider_name}
                </span>
                <span className="shrink-0 text-sm text-content-muted">{item.address_city}</span>
                <span className="shrink-0 text-xs text-content-muted">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
                <span
                  className={`shrink-0 rounded-full border px-3 py-0.5 text-xs font-medium ${statusStyle}`}
                  data-status={item.screening_status}
                >
                  {t(`adminScreening.status.${item.screening_status ?? 'clear'}`)}
                </span>
              </button>

              {/* Expanded detail */}
              {expanded && (
                <div className="space-y-5 border-t border-neutral-100 px-4 py-4">
                  {/* Screening flags */}
                  {item.screening_flags.length > 0 && (
                    <section>
                      <h3 className="mb-2 font-inter-tight text-sm font-semibold text-content-heading">
                        {t('providerReview.screeningFlags')}
                      </h3>
                      <ul className="space-y-2">
                        {item.screening_flags.map((flag, i) => {
                          const href = safeHref(flag.url);
                          return (
                            <li
                              key={`${flag.code}-${i}`}
                              className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm"
                            >
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="font-semibold text-content-heading">
                                  {flag.code}
                                </span>
                                {flag.term && (
                                  <span className="text-content-muted">{flag.term}</span>
                                )}
                              </div>
                              {flag.snippet && (
                                <blockquote className="mt-1 break-words text-sm text-content-muted">
                                  {flag.snippet}
                                </blockquote>
                              )}
                              {href && (
                                <a
                                  className="mt-2 inline-block text-sm text-primary underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                                  href={href}
                                  rel="noopener noreferrer"
                                  target="_blank"
                                >
                                  {t('adminScreening.openEvidence')}
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
                      <h3 className="mb-2 font-inter-tight text-sm font-semibold text-content-heading">
                        {t('providerReview.enrichmentLinks')}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {item.enrichment_links.map((link, i) => (
                          <a
                            key={i}
                            className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm text-primary underline hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2"
                            href={link.url}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            {link.platform}
                          </a>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Halal gate warning */}
                  {item.halal_pending && (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      {t('providerReview.halalPendingNote')}{' '}
                      <Link className="underline" href="/dashboard/halal-review">
                        {t('providerReview.halalReviewLink')}
                      </Link>
                    </p>
                  )}

                  {/* Error feedback */}
                  {err && (
                    <p className="text-sm text-red-800" role="alert">
                      {t(err)}{' '}
                      {err === 'providerReview.halalGate' && (
                        <Link className="underline" href="/dashboard/halal-review">
                          {t('providerReview.halalReviewLink')}
                        </Link>
                      )}
                    </p>
                  )}

                  {/* Actions */}
                  {!rejecting ? (
                    <div className="flex gap-3">
                      <Button
                        disabled={busy}
                        size="sm"
                        variant="primary"
                        onClick={() => approve(item)}
                      >
                        {t('providerReview.approve')}
                      </Button>
                      <Button
                        disabled={busy}
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          setRejectingId(item.provider_id);
                          setRejectFeedback('');
                        }}
                      >
                        {t('providerReview.reject')}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-content placeholder:text-content-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder={t('providerReview.rejectPlaceholder')}
                        rows={3}
                        value={rejectFeedback}
                        onChange={(e) => setRejectFeedback(e.target.value)}
                      />
                      <div className="flex gap-3">
                        <Button
                          disabled={busy || !rejectFeedback.trim()}
                          size="sm"
                          variant="danger"
                          onClick={() => submitReject(item)}
                        >
                          {t('providerReview.submitReject')}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setRejectingId(null);
                            setRejectFeedback('');
                          }}
                        >
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button size="sm" variant="secondary" onClick={() => load(offset, true)}>
            {t('providerReview.loadMore')}
          </Button>
        </div>
      )}
    </div>
  );
}
