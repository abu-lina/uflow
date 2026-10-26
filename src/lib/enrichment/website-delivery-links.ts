import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export type DeliveryPlatform = 'wolt' | 'lieferando' | 'ubereats';

export interface WebsiteDeliveryLink {
  platform: DeliveryPlatform;
  platform_url: string;
  platform_slug: string | null;
}

// Limited to the platforms the provider_delivery_links CHECK constraint accepts.
const PLATFORMS: Array<{
  platform: DeliveryPlatform;
  host: string;
  slugPattern: RegExp;
}> = [
  { platform: 'wolt', host: 'wolt.com', slugPattern: /\/(?:restaurant|venue)\/([^/?#]+)/ },
  { platform: 'lieferando', host: 'lieferando.de', slugPattern: /\/speisekarte\/([^/?#]+)/ },
  { platform: 'ubereats', host: 'ubereats.com', slugPattern: /\/store\/([^/?#]+)/ },
];

export const WEBSITE_SOURCE_PREFIX = 'provider_website';
export const DEFAULT_TIMEOUT_MS = 8000;
export const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
export const DEFAULT_MAX_REDIRECTS = 3;

function matchPlatform(hostname: string) {
  const host = hostname.toLowerCase();
  return PLATFORMS.find((p) => host === p.host || host.endsWith(`.${p.host}`));
}

function slugFrom(pattern: RegExp, pathname: string): string | null {
  const match = pathname.match(pattern);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function extractDeliveryLinksFromHtml(html: string, pageUrl: string): WebsiteDeliveryLink[] {
  const found = new Map<DeliveryPlatform, WebsiteDeliveryLink>();
  const anchor = /<a\s[^>]*?href\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

  for (const match of Array.from(html.matchAll(anchor))) {
    const href = (match[1] ?? match[2] ?? '').trim().replace(/&amp;/g, '&');
    let url: URL;
    try {
      url = new URL(href, pageUrl);
    } catch {
      continue;
    }
    if (url.protocol !== 'https:') continue;
    const entry = matchPlatform(url.hostname);
    if (!entry || found.has(entry.platform)) continue;
    found.set(entry.platform, {
      platform: entry.platform,
      platform_url: url.toString(),
      platform_slug: slugFrom(entry.slugPattern, url.pathname),
    });
  }
  return Array.from(found.values());
}

export function buildWebsiteDeliveryCandidate(
  providerId: string,
  sourceUrl: string,
  link: WebsiteDeliveryLink,
): Record<string, unknown> {
  return {
    provider_id: providerId,
    source: `${WEBSITE_SOURCE_PREFIX}:${link.platform}`,
    source_url: sourceUrl,
    field_name: 'delivery_links',
    proposed_value: [
      {
        platform: link.platform,
        platform_url: link.platform_url,
        platform_slug: link.platform_slug,
        is_active: true,
      },
    ],
    current_value: null,
    status: 'pending',
    enriched_at: new Date().toISOString(),
    enrichment_type: 'data',
  };
}

export function isPrivateAddress(address: string): boolean {
  const ip = address.toLowerCase().replace(/^\[|\]$/g, '');
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateAddress(mapped[1]);
  const mappedHex = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16);
    const lo = parseInt(mappedHex[2], 16);
    return isPrivateAddress(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }

  const family = isIP(ip);
  if (family === 4) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  if (family === 6) {
    return (
      ip === '::' || ip === '::1' || /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip) || /^ff/.test(ip)
    );
  }
  return true;
}

export type HostLookup = (hostname: string) => Promise<Array<{ address: string }>>;

const defaultLookup: HostLookup = (hostname) => dnsLookup(hostname, { all: true });

export interface FetchPageOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  fetchImpl?: typeof fetch;
  lookup?: HostLookup;
}

async function assertPublicHttps(url: URL, lookup: HostLookup): Promise<void> {
  if (url.protocol !== 'https:') throw new Error(`Only https URLs are allowed: ${url.protocol}`);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new Error(`Blocked private address: ${host}`);
    return;
  }
  const addresses = await lookup(host);
  if (addresses.length === 0) throw new Error(`Host did not resolve: ${host}`);
  if (addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error(`Blocked private address for host: ${host}`);
  }
}

async function readCapped(response: Response, maxBytes: number): Promise<string> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error('Response too large');
  if (!response.body) return '';

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error('Response too large');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function fetchPublicPage(
  startUrl: string,
  options: FetchPageOptions = {},
): Promise<{ html: string; url: string }> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxBytes = DEFAULT_MAX_BYTES,
    maxRedirects = DEFAULT_MAX_REDIRECTS,
    fetchImpl = fetch,
    lookup = defaultLookup,
  } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let current = new URL(startUrl);
    for (let hop = 0; hop <= maxRedirects; hop++) {
      await assertPublicHttps(current, lookup);
      const response = await fetchImpl(current.toString(), {
        redirect: 'manual',
        signal: controller.signal,
        headers: { Accept: 'text/html', 'User-Agent': 'UmmahflowBot/1.0 (+https://ummahflow.com)' },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        await response.body?.cancel();
        if (!location) throw new Error(`Redirect without location (${response.status})`);
        current = new URL(location, current);
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const type = response.headers.get('content-type') ?? '';
      if (!/html/i.test(type)) throw new Error(`Not an HTML response: ${type || 'unknown'}`);
      return { html: await readCapped(response, maxBytes), url: current.toString() };
    }
    throw new Error('Too many redirects');
  } finally {
    clearTimeout(timer);
  }
}
