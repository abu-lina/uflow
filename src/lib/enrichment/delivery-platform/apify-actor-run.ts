/**
 * Runs an Apify actor synchronously and returns its dataset items.
 *
 * Uses run-sync-get-dataset-items (waits up to 300 s) instead of polling, and
 * sends the token in a header so it never lands in URLs or logs.
 * Throws on any non-2xx response so a failed call is never mistaken for an
 * empty menu.
 */

const APIFY_BASE = 'https://api.apify.com/v2';
const REQUEST_TIMEOUT_MS = 310_000;

export interface MenuItemRow {
  name_de: string;
  description_de: string | null;
  category: string | null;
  price_cents: number | null;
  is_available: boolean;
  sort_order: number;
}

export async function runActorForItems<T>(
  actorId: string,
  input: Record<string, unknown>,
  apiToken: string,
): Promise<T[]> {
  const response = await fetch(`${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Apify actor ${actorId} failed: HTTP ${response.status} ${body.slice(0, 200)}`);
  }

  const items: unknown = await response.json();
  return Array.isArray(items) ? (items as T[]) : [];
}
