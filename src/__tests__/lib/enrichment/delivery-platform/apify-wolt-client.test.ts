import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchWoltRestaurant } from '@/lib/enrichment/delivery-platform/apify-wolt-client';

const TOKEN = 'apify_api_secret_token';

describe('apify-wolt-client keeps the Apify token out of URLs', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the token as an Authorization Bearer header on the run and the dataset call', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { status: 'SUCCEEDED', defaultDatasetId: 'ds1' } }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ name: 'Falafel', price: 8.5 }]), {
          status: 200,
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchWoltRestaurant('https://wolt.com/de/deu/berlin/venue/x', TOKEN);

    expect(result?.menuItems).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [url, init] of fetchMock.mock.calls) {
      expect(String(url)).not.toContain(TOKEN);
      expect(String(url)).not.toMatch(/token=/);
      expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
    }
  });
});
