const PROBE_ORIGIN = 'https://return-url.invalid';

/**
 * Returns the decoded `returnUrl` only if it is a same-origin path,
 * otherwise `fallback`. Blocks open redirects such as `//evil.example`.
 */
export function getSafeReturnUrl<F extends string | null>(
  raw: string | null | undefined,
  fallback: F
): string | F {
  if (!raw) return fallback;

  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return fallback;
  }

  if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.startsWith('/\\')) {
    return fallback;
  }

  return new URL(decoded, PROBE_ORIGIN).origin === PROBE_ORIGIN ? decoded : fallback;
}
