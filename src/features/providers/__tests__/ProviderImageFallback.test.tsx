import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ProviderImageFallback } from '@/features/providers/components/ProviderImageFallback';

describe('ProviderImageFallback', () => {
  // M1b: ornament-masked placeholder design (Figma node 460:2818)

  it('renders the fallback container with correct test id', () => {
    render(
      <ProviderImageFallback
        providerName="Bilal Moschee"
        categoryId="mosque"
        providerId="provider-1"
      />,
    );

    expect(screen.getByTestId('provider-image-fallback')).toBeInTheDocument();
  });

  it('renders the ornament overlay SVG', () => {
    render(
      <ProviderImageFallback
        providerName="Bilal Moschee"
        categoryId="mosque"
        providerId="provider-1"
      />,
    );

    const ornament = screen.getByTestId('provider-fallback-ornament');
    expect(ornament).toBeInTheDocument();
    expect(ornament).toHaveAttribute('src', '/images/ornament-mask.svg');
  });

  it('renders the UFlow logo mark SVG', () => {
    render(
      <ProviderImageFallback
        providerName="Bilal Moschee"
        categoryId="mosque"
        providerId="provider-1"
      />,
    );

    const logoMark = screen.getByTestId('provider-fallback-logo-mark');
    expect(logoMark).toBeInTheDocument();
    expect(logoMark).toHaveAttribute('src', '/images/uflow-logo-mark.svg');
  });

  it('renders stock image when stockImageUrl is provided', () => {
    const url =
      'https://mock-supabase-url.com/storage/v1/object/public/provider-images/enrichment/stock/food/photo-1.webp';
    render(
      <ProviderImageFallback
        providerName="Kebab Palace"
        categoryId="20c10efe-404b-4a39-bb81-5089a0332d78"
        providerId="provider-2"
        stockImageUrl={url}
      />,
    );

    const stockImg = screen.getByTestId('provider-fallback-stock-image');
    expect(stockImg).toBeInTheDocument();
    expect(stockImg).toHaveAttribute('src', url);
  });

  it('does not render stock image when stockImageUrl is null', () => {
    render(
      <ProviderImageFallback
        providerName="Kebab Palace"
        categoryId="food"
        providerId="provider-3"
        stockImageUrl={null}
      />,
    );

    expect(screen.queryByTestId('provider-fallback-stock-image')).not.toBeInTheDocument();
  });

  it('does not render stock image when stockImageUrl is omitted', () => {
    render(
      <ProviderImageFallback
        providerName="Kebab Palace"
        categoryId="food"
        providerId="provider-4"
      />,
    );

    expect(screen.queryByTestId('provider-fallback-stock-image')).not.toBeInTheDocument();
  });

  it('uses injected i18n labels for anonymous name and aria text', () => {
    render(
      <ProviderImageFallback
        providerName=""
        categoryId="food"
        providerId="p8"
        anonymousName="Anbieter"
        fallbackImageAriaLabel="Fallback-Bild fuer Anbieter"
      />,
    );

    expect(screen.getByLabelText('Fallback-Bild fuer Anbieter')).toBeInTheDocument();
  });

  it('does not throw for null/undefined/empty/rtl/emoji/long strings', () => {
    const veryLongName = 'a'.repeat(260);

    expect(() =>
      render(<ProviderImageFallback providerName={null} categoryId={null} providerId={null} />),
    ).not.toThrow();

    expect(() =>
      render(
        <ProviderImageFallback
          providerName={undefined}
          categoryId={undefined}
          providerId={undefined}
        />,
      ),
    ).not.toThrow();

    expect(() =>
      render(<ProviderImageFallback providerName="" categoryId="" providerId="" />),
    ).not.toThrow();
    expect(() =>
      render(<ProviderImageFallback providerName="مسجد" categoryId="ummah" providerId="p5" />),
    ).not.toThrow();
    expect(() =>
      render(
        <ProviderImageFallback providerName="☪️ Bakery" categoryId="food" providerId="p6" />,
      ),
    ).not.toThrow();
    expect(() =>
      render(
        <ProviderImageFallback providerName={veryLongName} categoryId="food" providerId="p7" />,
      ),
    ).not.toThrow();
  });
});
