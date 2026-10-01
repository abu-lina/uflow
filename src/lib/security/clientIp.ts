/**
 * Resolve the trusted client IP from proxy headers.
 *
 * Trust order:
 * 1. x-real-ip — nginx sets it via `proxy_set_header`, which replaces any
 *    client-supplied value with $remote_addr.
 * 2. The LAST non-empty element of x-forwarded-for — the hop appended by the
 *    nearest trusted proxy. The first element is client-supplied and
 *    forgeable; reading it lets an attacker pick their own IP.
 * 3. 'unknown' when neither is present.
 *
 * cf-connecting-ip is deliberately NOT read: nginx neither sets nor strips
 * it, so until nginx is configured with Cloudflare's ranges via
 * real_ip_module it is pure client input. Reintroduce it only together with
 * that config.
 *
 * This module must stay dependency-free: src/middleware.ts runs in the Edge
 * runtime and importing larger modules would bloat that bundle.
 */
export function getTrustedClientIp(headers: Headers): string {
  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp) {
    return realIp;
  }

  const forwarded = headers.get('x-forwarded-for');
  if (forwarded?.trim()) {
    const hops = forwarded
      .split(',')
      .map((hop) => hop.trim())
      .filter(Boolean);
    const last = hops[hops.length - 1];
    if (last) {
      return last;
    }
  }

  return 'unknown';
}
