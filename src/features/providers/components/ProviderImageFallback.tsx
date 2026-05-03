interface ProviderImageFallbackProps {
  providerName?: string | null;
  categoryId?: string | null;
  providerId?: string | null;
  anonymousName?: string;
  fallbackImageAriaLabel?: string;
  className?: string;
  backgroundColor?: string; // Optional background color for category fallback
}

/**
 * Simple placeholder shown only when no image is available at all
 * (no provider upload AND no static category image).
 * Renders: clean mint/neutral background.
 */
export function ProviderImageFallback({
  providerName,
  categoryId: _categoryId,
  providerId: _providerId,
  anonymousName,
  fallbackImageAriaLabel,
  className,
  backgroundColor,
}: ProviderImageFallbackProps) {
  const safeName =
    typeof providerName === 'string' && providerName.trim().length > 0
      ? providerName.trim()
      : typeof anonymousName === 'string' && anonymousName.trim().length > 0
        ? anonymousName.trim()
        : '';

  const resolvedAriaLabel =
    typeof fallbackImageAriaLabel === 'string' && fallbackImageAriaLabel.trim().length > 0
      ? fallbackImageAriaLabel
      : safeName || undefined;

  return (
    <div
      aria-label={resolvedAriaLabel}
      className={`absolute inset-0 overflow-hidden rounded-t-3xl ${className || ''}`}
      data-testid="provider-image-fallback"
      style={backgroundColor ? { backgroundColor } : { backgroundColor: '#f3f4f6' }}
    />
  );
}

