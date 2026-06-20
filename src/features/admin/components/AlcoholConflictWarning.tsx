'use client';

import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';

/**
 * AlcoholConflictWarning — Plan 193
 *
 * Client component that checks a provider's enriched menu items for alcohol
 * keywords (Bier, Wein, etc.) and renders a warning banner when alcohol is
 * found. This catches cases where automated enrichment (e.g. Wolt) pulled
 * menu items containing alcohol that the reviewer may have missed during
 * manual website review.
 *
 * Usage:
 *   <AlcoholConflictWarning providerId="uuid-here" />
 */

interface MenuAlcoholCheckResult {
  hasAlcohol: boolean;
  matchedItemNames: string[];
  matchedKeywords: string[];
  totalMenuItems: number;
}

interface AlcoholConflictWarningProps {
  /** Provider UUID to check */
  providerId: string;
  /** Optional base URL for the menu review link */
  menuReviewBaseUrl?: string;
}

/**
 * Get unique values from an array (avoids Set for TS compatibility).
 */
function uniqueValues(items: string[]): string[] {
  const result: string[] = [];
  for (const item of items) {
    if (result.indexOf(item) === -1) {
      result.push(item);
    }
  }
  return result;
}

export function AlcoholConflictWarning({
  providerId,
  menuReviewBaseUrl = `/dashboard/providers/${providerId}/edit/menu`,
}: AlcoholConflictWarningProps) {
  const [result, setResult] = useState<MenuAlcoholCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMenuCheck = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/enrichment/alcohol-conflicts?providerId=${encodeURIComponent(providerId)}`
      );
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setResult(null);
          setLoading(false);
          return;
        }
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data: MenuAlcoholCheckResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check menu');
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    fetchMenuCheck();
  }, [fetchMenuCheck]);

  if (loading || error || !result || !result.hasAlcohol) {
    return null;
  }

  const uniqueKeywords = uniqueValues(result.matchedKeywords);
  const itemPreview = result.matchedItemNames.slice(0, 5);
  const remainingCount = result.matchedItemNames.length - itemPreview.length;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4" role="alert">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <Icon
            className="h-5 w-5 text-amber-600"
            icon="lucide:triangle-alert"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-amber-800">
            Menu contains alcohol-related items
          </h3>
          <p className="mt-1 text-sm text-amber-700">
            Automated enrichment (e.g. Wolt) imported menu items that contain
            alcohol keywords{' '}
            <strong>({uniqueKeywords.join(', ')})</strong>.
            These may not have been visible during your website review.
          </p>
          {itemPreview.length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-0.5 text-sm text-amber-700">
              {itemPreview.map((name, i) => (
                <li key={i}>{name}</li>
              ))}
              {remainingCount > 0 && (
                <li className="list-none text-amber-500">
                  … and {remainingCount} more
                </li>
              )}
            </ul>
          )}
          <div className="mt-3">
            <a
              className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-800 underline transition-colors hover:text-amber-900"
              href={menuReviewBaseUrl}
            >
              Review menu items
              <Icon className="h-4 w-4" icon="lucide:arrow-right" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
