/**
 * Shared iOS/Android/fallback permission-denied hint-key selector for the
 * "Near me" chip row. Extracted from HomeSearchBar and NearMeOpenNowFilters
 * so both surfaces (home and results) use the same platform detection logic.
 */
export function getNearMePermissionHintKey(): string {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
  const isIOS =
    /iphone|ipad|ipod/.test(userAgent) ||
    (userAgent.includes('macintosh') && navigator.maxTouchPoints > 1);
  const isAndroid = userAgent.includes('android');

  if (isIOS) return 'suchen.nearMe.permissionDeniedHintIos';
  if (isAndroid) return 'suchen.nearMe.permissionDeniedHintAndroid';
  return 'suchen.nearMe.permissionDeniedHintFallback';
}
