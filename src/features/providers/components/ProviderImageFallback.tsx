// Figma source: https://www.figma.com/design/mH4p6c8GExOuLn65WdSPMb/playground?node-id=460-2818
// Ornament SVG: node 460:2819 (viewBox 0 0 163 163) → public/images/ornament-mask.svg
// Logo mark SVG: node 460:2823 (viewBox 0 0 25.33 19.22) → public/images/uflow-logo-mark.svg

interface ProviderImageFallbackProps {
  providerName?: string | null;
  categoryId?: string | null;
  providerId?: string | null;
  /** Optional pre-resolved Supabase Storage URL for the category stock photo (Layer 2).
   *  When omitted or null the fallback renders mint + ornament + logo only. */
  stockImageUrl?: string | null;
  anonymousName?: string;
  fallbackImageAriaLabel?: string;
  className?: string;
}

export function ProviderImageFallback({
  providerName,
  categoryId: _categoryId,
  providerId: _providerId,
  stockImageUrl,
  anonymousName,
  fallbackImageAriaLabel,
  className,
}: ProviderImageFallbackProps) {
  const safeName =
    typeof providerName === 'string' && providerName.trim().length > 0
      ? providerName.trim()
      : anonymousName || 'Provider';

  return (
    <div
      aria-label={fallbackImageAriaLabel || `Fallback image for ${safeName}`}
      className={`absolute inset-0 overflow-hidden rounded-t-3xl ${className || ''}`}
      data-testid="provider-image-fallback"
    >
      {/* Layer 1: Mint background — always visible */}
      <div aria-hidden="true" className="absolute inset-0 bg-[#d8efe5]" />

      {/* Layer 2: Category stock photo — optional, omitted when stockImageUrl is null/undefined */}
      {stockImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          data-testid="provider-fallback-stock-image"
          src={stockImageUrl}
        />
      ) : null}

      {/* Layer 3: Ornament overlay — Islamic geometric SVG, semi-transparent white */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        data-testid="provider-fallback-ornament"
        src="/images/ornament-mask.svg"
        style={{ opacity: 0.9 }}
      />

      {/* Layer 4: UFlow logo mark — crescent/leaf, centred, luminosity blend */}
      <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          aria-hidden="true"
          className="h-5 w-auto"
          data-testid="provider-fallback-logo-mark"
          src="/images/uflow-logo-mark.svg"
          style={{ mixBlendMode: 'luminosity', opacity: 0.7 }}
        />
      </div>
    </div>
  );
}

