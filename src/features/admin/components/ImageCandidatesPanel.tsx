'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';

import { useLanguage } from '@/providers/LanguageProvider';
import { isAllowedImageUrl } from '@/utils/imageUtils';

interface ImageCandidate {
  id: string;
  source: string;
  image_url: string | null;
  enrichment_type?: 'data' | 'image';
}

interface ImageCandidatesPanelProps {
  providerId: string;
  /** Called with the image URL after a candidate was approved */
  onApproved?: (imageUrl: string) => void;
}

const ENDPOINT = '/api/admin/enrichment/candidates';
const THUMB_SIZE = 160;

// Only http(s) URLs become links; anything else (e.g. javascript:) gets no href
function safeHref(url: string | null): string | undefined {
  return url && /^https?:\/\//i.test(url) ? url : undefined;
}

async function readError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return body.error ?? `HTTP ${res.status}`;
}

export function ImageCandidatesPanel({ providerId, onApproved }: ImageCandidatesPanelProps) {
  const { t } = useLanguage();
  const [candidates, setCandidates] = useState<ImageCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ providerId, limit: '50' });
      const res = await fetch(`${ENDPOINT}?${params}`);
      if (res.status === 401 || res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) throw new Error(await readError(res));
      const json = await res.json();
      const rows: ImageCandidate[] = json.data ?? [];
      setCandidates(rows.filter((c) => c.enrichment_type === 'image' && c.image_url));
    } catch (err) {
      setError(err instanceof Error ? err.message : '');
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (action: 'approve' | 'reject', candidateId: string) => {
    setBusyId(candidateId);
    setError(null);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, candidateId }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const approved = candidates.find((c) => c.id === candidateId);
      setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
      if (action === 'approve' && approved?.image_url) onApproved?.(approved.image_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '');
    } finally {
      setBusyId(null);
    }
  };

  const sourceLabel = (source: string) => {
    const key = `editProvider.editImages.candidates.source.${source}`;
    const label = t(key);
    return label === key ? source : label;
  };

  if (forbidden) return null;

  if (loading) {
    return (
      <div className="mt-8 flex items-center gap-2" role="status">
        <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-gray-500">
          {t('editProvider.editImages.candidates.loading')}
        </span>
      </div>
    );
  }

  if (candidates.length === 0 && error === null) return null;

  return (
    <section className="mt-8 flex w-full flex-col gap-4">
      <h3 className="flex items-center gap-2 text-sm font-medium text-[#232323]">
        {t('editProvider.editImages.candidates.title')}
        {candidates.length > 0 && (
          <span
            className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800"
            data-testid="image-candidates-count"
          >
            {candidates.length}
          </span>
        )}
      </h3>
      {error && (
        <p
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {error || t('editProvider.editImages.candidates.genericError')}
        </p>
      )}
      <ul className="grid grid-cols-2 gap-4">
        {candidates.map((c, idx) => (
          <li key={c.id} className="flex flex-col gap-2 rounded-[12px] border border-[#D4D4D4] p-2">
            {isAllowedImageUrl(c.image_url) ? (
              <Image
                alt={t('editProvider.editImages.candidates.alt', { index: idx + 1 })}
                className="rounded-[8px] object-cover"
                height={THUMB_SIZE}
                src={c.image_url}
                width={THUMB_SIZE}
              />
            ) : (
              <div
                className="flex items-center justify-center rounded-[8px] bg-gray-100"
                data-testid="image-candidate-placeholder"
                style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
              >
                <a
                  className="px-2 text-center text-xs text-blue-700 underline"
                  href={safeHref(c.image_url)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {t('editProvider.editImages.candidates.openImage')}
                </a>
              </div>
            )}
            <span className="text-xs text-gray-500">{sourceLabel(c.source)}</span>
            <div className="flex gap-2">
              <button
                aria-label={t('editProvider.editImages.candidates.approveAria', { index: idx + 1 })}
                className="flex-1 rounded-[8px] bg-primary px-2 py-1 text-sm text-white disabled:opacity-50"
                disabled={busyId !== null}
                type="button"
                onClick={() => void act('approve', c.id)}
              >
                {t('editProvider.editImages.candidates.approve')}
              </button>
              <button
                aria-label={t('editProvider.editImages.candidates.rejectAria', { index: idx + 1 })}
                className="flex-1 rounded-[8px] border border-[#CDCDCD] px-2 py-1 text-sm disabled:opacity-50"
                disabled={busyId !== null}
                type="button"
                onClick={() => void act('reject', c.id)}
              >
                {t('editProvider.editImages.candidates.reject')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
