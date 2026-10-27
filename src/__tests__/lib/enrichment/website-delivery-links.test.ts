import { describe, expect, it, vi } from 'vitest';

import {
  buildWebsiteDeliveryCandidate,
  extractDeliveryLinksFromHtml,
  fetchPublicPage,
  isPrivateAddress,
} from '@/lib/enrichment/website-delivery-links';

const PAGE = 'https://tevhid.example/';
const publicLookup = async () => [{ address: '93.184.216.34' }];

const html = (...hrefs: string[]) =>
  `<html><body>${hrefs.map((h) => `<a href="${h}">x</a>`).join('')}</body></html>`;

describe('#801 one candidate per platform with the source page URL', () => {
  it('extracts Lieferando, Wolt and Uber Eats links from outbound anchors', () => {
    const links = extractDeliveryLinksFromHtml(
      html(
        'https://www.lieferando.de/speisekarte/tevhid-doener',
        'https://wolt.com/de/deu/berlin/restaurant/tevhid',
        'https://www.ubereats.com/de/store/tevhid/abc123',
      ),
      PAGE,
    );
    expect(links).toEqual([
      {
        platform: 'lieferando',
        platform_url: 'https://www.lieferando.de/speisekarte/tevhid-doener',
        platform_slug: 'tevhid-doener',
      },
      {
        platform: 'wolt',
        platform_url: 'https://wolt.com/de/deu/berlin/restaurant/tevhid',
        platform_slug: 'tevhid',
      },
      {
        platform: 'ubereats',
        platform_url: 'https://www.ubereats.com/de/store/tevhid/abc123',
        platform_slug: 'tevhid',
      },
    ]);
  });

  it('keeps only the first link when a platform appears twice', () => {
    const links = extractDeliveryLinksFromHtml(
      html(
        'https://wolt.com/de/deu/berlin/restaurant/a',
        'https://wolt.com/de/deu/berlin/restaurant/b',
      ),
      PAGE,
    );
    expect(links).toHaveLength(1);
    expect(links[0].platform_slug).toBe('a');
  });

  it('builds a pending data candidate that carries the source page URL', () => {
    const row = buildWebsiteDeliveryCandidate('p1', PAGE, {
      platform: 'wolt',
      platform_url: 'https://wolt.com/de/deu/berlin/restaurant/tevhid',
      platform_slug: 'tevhid',
    });
    expect(row).toMatchObject({
      provider_id: 'p1',
      field_name: 'delivery_links',
      source: 'provider_website:wolt',
      source_url: PAGE,
      status: 'pending',
      enrichment_type: 'data',
      proposed_value: [
        {
          platform: 'wolt',
          platform_url: 'https://wolt.com/de/deu/berlin/restaurant/tevhid',
          platform_slug: 'tevhid',
          is_active: true,
        },
      ],
    });
  });
});

describe('#801 only links to a fixed allow-list of platform hosts are staged', () => {
  it('ignores other outbound links, look-alike hosts and non-https links', () => {
    const links = extractDeliveryLinksFromHtml(
      html(
        'https://example.com/wolt.com/restaurant/x',
        'https://wolt.com.evil.example/restaurant/x',
        'https://notlieferando.de/speisekarte/x',
        'http://www.lieferando.de/speisekarte/insecure',
        'mailto:info@wolt.com',
        'javascript:alert(1)',
        'https://www.instagram.com/tevhid',
      ),
      PAGE,
    );
    expect(links).toEqual([]);
  });

  it('accepts the Austrian Lieferando host but not other brands', () => {
    const links = extractDeliveryLinksFromHtml(
      html(
        'https://www.lieferando.at/speisekarte/wiener-doener',
        'https://www.takeaway.com/de/speisekarte/other',
      ),
      PAGE,
    );
    expect(links).toEqual([
      {
        platform: 'lieferando',
        platform_url: 'https://www.lieferando.at/speisekarte/wiener-doener',
        platform_slug: 'wiener-doener',
      },
    ]);
  });

  it('accepts subdomains of allowed hosts and ignores relative links', () => {
    const links = extractDeliveryLinksFromHtml(
      html('https://order.wolt.com/de/deu/berlin/restaurant/x', '/speisekarte/local'),
      PAGE,
    );
    expect(links.map((l) => l.platform)).toEqual(['wolt']);
  });

  it('returns nothing for a page without anchors', () => {
    expect(extractDeliveryLinksFromHtml('<html>no links</html>', PAGE)).toEqual([]);
  });
});

describe('#801 fetch is https only and blocks private or internal addresses', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '::1',
    'fe80::1',
    'fc00::1',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    '::127.0.0.1',
    '::7f00:1',
    '64:ff9b::7f00:1',
    '64:ff9b::a00:1',
    '2002:7f00:1::',
    '2002:c0a8:101::1',
  ])('treats %s as private', (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  it.each([
    '93.184.216.34',
    '8.8.8.8',
    '172.32.0.1',
    '2606:4700:4700::1111',
    '64:ff9b::808:808',
    '2002:808:808::1',
    '::ffff:808:808',
  ])('treats %s as public', (ip) => {
    expect(isPrivateAddress(ip)).toBe(false);
  });

  it('rejects http URLs without fetching', async () => {
    const fetchImpl = vi.fn();
    await expect(
      fetchPublicPage('http://tevhid.example/', { fetchImpl, lookup: publicLookup }),
    ).rejects.toThrow(/https/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects literal private IP hosts without fetching', async () => {
    const fetchImpl = vi.fn();
    await expect(
      fetchPublicPage('https://169.254.169.254/latest', { fetchImpl, lookup: publicLookup }),
    ).rejects.toThrow(/private/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('rejects hosts that resolve to a private address', async () => {
    const fetchImpl = vi.fn();
    await expect(
      fetchPublicPage(PAGE, {
        fetchImpl,
        lookup: async () => [{ address: '93.184.216.34' }, { address: '10.0.0.5' }],
      }),
    ).rejects.toThrow(/private/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('re-checks every redirect hop and refuses a redirect to an internal host', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(null, { status: 302, headers: { location: 'https://internal.example/' } }),
    );
    const lookup = async (host: string) => [
      { address: host === 'internal.example' ? '192.168.0.10' : '93.184.216.34' },
    ];
    await expect(fetchPublicPage(PAGE, { fetchImpl, lookup })).rejects.toThrow(/private/i);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('refuses a redirect to http', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(null, { status: 301, headers: { location: 'http://tevhid.example/' } }),
    );
    await expect(fetchPublicPage(PAGE, { fetchImpl, lookup: publicLookup })).rejects.toThrow(
      /https/i,
    );
  });

  it('follows a public https redirect and reports the final URL', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 301,
          headers: { location: 'https://www.tevhid.example/home' },
        }),
      )
      .mockResolvedValueOnce(
        new Response('<a href="https://wolt.com/x">x</a>', {
          headers: { 'content-type': 'text/html' },
        }),
      );
    const page = await fetchPublicPage(PAGE, { fetchImpl, lookup: publicLookup });
    expect(page.url).toBe('https://www.tevhid.example/home');
    expect(page.html).toContain('wolt.com');
  });

  it('gives up after too many redirects', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(null, { status: 302, headers: { location: 'https://tevhid.example/loop' } }),
    );
    await expect(
      fetchPublicPage(PAGE, { fetchImpl, lookup: publicLookup, maxRedirects: 2 }),
    ).rejects.toThrow(/redirect/i);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});

describe('#801 fetch has a timeout and a response size cap', () => {
  it('rejects a response larger than the cap', async () => {
    const fetchImpl = vi.fn(
      async () => new Response('a'.repeat(5000), { headers: { 'content-type': 'text/html' } }),
    );
    await expect(
      fetchPublicPage(PAGE, { fetchImpl, lookup: publicLookup, maxBytes: 1000 }),
    ).rejects.toThrow(/too large/i);
  });

  it('rejects a response whose content-length exceeds the cap', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response('small', {
          headers: { 'content-type': 'text/html', 'content-length': '999999' },
        }),
    );
    await expect(
      fetchPublicPage(PAGE, { fetchImpl, lookup: publicLookup, maxBytes: 1000 }),
    ).rejects.toThrow(/too large/i);
  });

  it('aborts a request that exceeds the timeout', async () => {
    const fetchImpl = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    await expect(
      fetchPublicPage(PAGE, {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        lookup: publicLookup,
        timeoutMs: 20,
      }),
    ).rejects.toThrow();
  });

  it('rejects non-HTML responses and error statuses', async () => {
    const json = vi.fn(
      async () => new Response('{}', { headers: { 'content-type': 'application/json' } }),
    );
    await expect(fetchPublicPage(PAGE, { fetchImpl: json, lookup: publicLookup })).rejects.toThrow(
      /html/i,
    );

    const notFound = vi.fn(
      async () => new Response('nope', { status: 404, headers: { 'content-type': 'text/html' } }),
    );
    await expect(
      fetchPublicPage(PAGE, { fetchImpl: notFound, lookup: publicLookup }),
    ).rejects.toThrow(/404/);
  });
});
