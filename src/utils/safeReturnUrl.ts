const PROBE_ORIGIN = 'https://return-url.invalid';

/**
 * Returns the parsed, normalized `returnUrl` only if it is a same-origin
 * path, otherwise `fallback`. Blocks open redirects such as `//evil.example`.
 */
export function getSafeReturnUrl<F extends string | null>(
  raw: string | null | undefined,
  fallback: F
): string | F {
  if (!raw) return fallback;

  let decoded: string;
  try {
    // Deliberate second decode (searchParams.get already decoded once) so `%2F%2Fevil.example` is caught.
    decoded = decodeURIComponent(raw);
  } catch {
    return fallback;
  }

  if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.startsWith('/\\')) {
    return fallback;
  }

  const url = new URL(decoded, PROBE_ORIGIN);
  return url.origin === PROBE_ORIGIN ? url.pathname + url.search + url.hash : fallback;
}
