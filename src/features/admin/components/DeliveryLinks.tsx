const PLATFORM_LABELS: Record<string, string> = {
  wolt: 'Wolt',
  lieferando: 'Lieferando',
  ubereats: 'Uber Eats',
};

function isHttpsUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https:\/\//i.test(value);
}

/** Proposed value of a `delivery_links` enrichment candidate: platform, URL and the page it came from. */
export function DeliveryLinks({ value, sourceUrl }: { value: unknown; sourceUrl: string | null }) {
  const links = Array.isArray(value)
    ? (value as Array<{ platform?: string; platform_url?: unknown }>)
    : [];
  return (
    <div className="space-y-1 text-xs">
      {links.map((link, i) => (
        <div key={`${link.platform}-${i}`} className="text-green-700">
          <span className="font-medium">
            {PLATFORM_LABELS[link.platform ?? ''] ?? link.platform ?? 'Unknown'}
          </span>
          {isHttpsUrl(link.platform_url) ? (
            <a
              className="ml-2 break-all font-mono underline"
              href={link.platform_url}
              rel="noopener noreferrer"
              target="_blank"
            >
              {link.platform_url}
            </a>
          ) : (
            <span className="ml-2 font-mono">{String(link.platform_url ?? '—')}</span>
          )}
        </div>
      ))}
      {isHttpsUrl(sourceUrl) && (
        <div className="text-gray-500">
          Found on{' '}
          <a
            className="break-all font-mono underline"
            href={sourceUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {sourceUrl}
          </a>
        </div>
      )}
    </div>
  );
}
