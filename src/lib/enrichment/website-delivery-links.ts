import { lookup as dnsLookup } from 'node:dns/promises';
import type { LookupFunction } from 'node:net';
import { isIP } from 'node:net';
import { request as httpsRequest } from 'node:https';
import { Readable } from 'node:stream';

export type DeliveryPlatform = 'wolt' | 'lieferando' | 'ubereats';

export interface WebsiteDeliveryLink {
  platform: DeliveryPlatform;
  platform_url: string;
  platform_slug: string | null;
}

// Limited to the platforms the provider_delivery_links CHECK constraint accepts.
// takeaway.com and lieferando.com are left out: other brands/markets would be filed under the wrong platform.
const PLATFORMS: Array<{
  platform: DeliveryPlatform;
  hosts: string[];
  slugPattern: RegExp;
}> = [
  {
    platform: 'wolt',
    hosts: ['wolt.com', 'www.wolt.com'],
    slugPattern: /\/(?:restaurant|venue)\/([^/?#]+)/,
  },
  {
    platform: 'lieferando',
    hosts: ['lieferando.de', 'www.lieferando.de', 'lieferando.at', 'www.lieferando.at'],
    slugPattern: /\/speisekarte\/([^/?#]+)/,
  },
  {
    platform: 'ubereats',
    hosts: ['ubereats.com', 'www.ubereats.com'],
    slugPattern: /\/store\/([^/?#]+)/,
  },
];

export const DELIVERY_PLATFORMS: DeliveryPlatform[] = PLATFORMS.map((p) => p.platform);

export const WEBSITE_SOURCE_PREFIX = 'provider_website';
export const DEFAULT_TIMEOUT_MS = 8000;
export const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
export const DEFAULT_MAX_REDIRECTS = 3;

function matchPlatform(hostname: string) {
  return PLATFORMS.find((p) => p.hosts.includes(hostname.toLowerCase()));
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
    if (url.protocol !== 'https:' || url.username || url.password || url.port) continue;
    const entry = matchPlatform(url.hostname);
    if (!entry || found.has(entry.platform)) continue;
    // Links can be written live, so a link must name one venue page, not a homepage or listing.
    const slug = slugFrom(entry.slugPattern, url.pathname);
    if (!slug) continue;
    found.set(entry.platform, {
      platform: entry.platform,
      platform_url: `${url.origin}${url.pathname}`,
      platform_slug: slug,
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
  const family = isIP(ip);
  if (family === 4) return isPrivateV4(ip.split('.').map(Number));
  if (family !== 6) return true;

  const groups = expandV6(ip);
  if (!groups) return true;
  const embeddedV4 = (hi: number, lo: number) =>
    isPrivateV4([hi >> 8, hi & 255, lo >> 8, lo & 255]);

  // ::/96 (unspecified, loopback, IPv4-compatible) never carries public traffic.
  if (groups.slice(0, 6).every((g) => g === 0)) return true;
  // IPv4-mapped ::ffff:a.b.c.d
  if (groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff) {
    return embeddedV4(groups[6], groups[7]);
  }
  // NAT64 64:ff9b::/96
  if (groups[0] === 0x64 && groups[1] === 0xff9b && groups.slice(2, 6).every((g) => g === 0)) {
    return embeddedV4(groups[6], groups[7]);
  }
  // 6to4 2002::/16 embeds the IPv4 address in the next 32 bits
  if (groups[0] === 0x2002) return embeddedV4(groups[1], groups[2]);

  return (
    (groups[0] & 0xfe00) === 0xfc00 || // fc00::/7 unique local
    (groups[0] & 0xffc0) === 0xfe80 || // fe80::/10 link local
    (groups[0] & 0xff00) === 0xff00 // ff00::/8 multicast
  );
}

function isPrivateV4([a, b]: number[]): boolean {
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

// Expands a valid IPv6 literal (incl. a trailing dotted IPv4) into eight 16-bit groups.
function expandV6(ip: string): number[] | null {
  let text = ip.replace(/%.*$/, '');
  const dotted = text.match(/^(.*:)(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (dotted) {
    const [, head, a, b, c, d] = dotted;
    text = `${head}${((+a << 8) | +b).toString(16)}:${((+c << 8) | +d).toString(16)}`;
  }
  const [left, right, ...extra] = text.split('::');
  if (extra.length > 0) return null;
  const head = left ? left.split(':') : [];
  const tail = right === undefined ? [] : right ? right.split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (right === undefined ? missing !== 0 : missing < 1) return null;
  const groups = [...head, ...Array<string>(right === undefined ? 0 : missing).fill('0'), ...tail];
  const values = groups.map((g) => parseInt(g, 16));
  return values.length === 8 && values.every((v) => Number.isInteger(v)) ? values : null;
}

export type HostLookup = (hostname: string) => Promise<Array<{ address: string }>>;

const defaultLookup: HostLookup = (hostname) => dnsLookup(hostname, { all: true });

type FetchLike = (
  url: string,
  init: { redirect: 'manual'; signal: AbortSignal; headers: Record<string, string> },
) => Promise<Response>;

export interface FetchPageOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  fetchImpl?: FetchLike;
  lookup?: HostLookup;
}

// Validates at connect time and hands back the checked address, so the socket
// cannot be pointed somewhere else by a second DNS answer (rebinding).
function createGuardedLookup(lookup: HostLookup): LookupFunction {
  return (hostname, options, callback) => {
    lookup(hostname)
      .then((addresses) => {
        if (addresses.length === 0) throw new Error(`Host did not resolve: ${hostname}`);
        if (addresses.some((a) => isPrivateAddress(a.address))) {
          throw new Error(`Blocked private address for host: ${hostname}`);
        }
        const { address } = addresses[0];
        const family = isIP(address);
        if (options.all) callback(null, [{ address, family }]);
        else callback(null, address, family);
      })
      .catch((err: unknown) => callback(err as Error, '', 4));
  };
}

function createPinnedFetch(lookup: HostLookup): FetchLike {
  const guarded = createGuardedLookup(lookup);
  return (url, init) =>
    new Promise<Response>((resolve, reject) => {
      const req = httpsRequest(
        new URL(url),
        { method: 'GET', headers: init.headers, lookup: guarded, signal: init.signal },
        (res) => {
          const headers = new Headers();
          for (const [name, value] of Object.entries(res.headers)) {
            if (Array.isArray(value)) value.forEach((v) => headers.append(name, v));
            else if (value !== undefined) headers.set(name, value);
          }
          const status = res.statusCode ?? 0;
          const body = [204, 205, 304].includes(status)
            ? null
            : (Readable.toWeb(res) as ReadableStream<Uint8Array>);
          resolve(new Response(body, { status, headers }));
        },
      );
      req.on('error', reject);
      req.end();
    });
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
    lookup = defaultLookup,
    fetchImpl = createPinnedFetch(lookup),
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
