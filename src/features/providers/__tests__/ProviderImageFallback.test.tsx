import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ProviderImageFallback } from '@/features/providers/components/ProviderImageFallback';

describe('ProviderImageFallback', () => {
  // Simple fallback placeholder (no ornament overlay)

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

  it('renders neutral background without decorative overlays', () => {
    const { container } = render(
      <ProviderImageFallback
        providerName="Bilal Moschee"
        categoryId="mosque"
        providerId="provider-1"
      />,
    );

    const fallback = screen.getByTestId('provider-image-fallback');
    // Verify the fallback has a background color (default or provided)
    expect(fallback).toHaveStyle('background-color: #f3f4f6');
    // Verify no ornament or logo SVGs are rendered
    expect(screen.queryByTestId('provider-fallback-ornament')).not.toBeInTheDocument();
    expect(screen.queryByTestId('provider-fallback-logo-mark')).not.toBeInTheDocument();
  });

  it('does not render stock images', () => {
    render(
      <ProviderImageFallback
        providerName="Kebab Palace"
        categoryId="20c10efe-404b-4a39-bb81-5089a0332d78"
        providerId="provider-2"
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
      render(
        <ProviderImageFallback
          providerName=""
          categoryId=""
          providerId=""
          anonymousName="Test"
        />,
      ),
    ).not.toThrow();

    expect(() =>
      render(
        <ProviderImageFallback
          providerName="مرحبا"
          categoryId="food"
          providerId="p5"
          anonymousName="العربية"
        />,
      ),
    ).not.toThrow();

    expect(() =>
      render(
        <ProviderImageFallback
          providerName="Emoji 🍕🎉"
          categoryId="food"
          providerId="p6"
        />,
      ),
    ).not.toThrow();

    expect(() =>
      render(
        <ProviderImageFallback
          providerName={veryLongName}
          categoryId="food"
          providerId="p7"
        />,
      ),
    ).not.toThrow();
  });

  it('applies custom backgroundColor prop when provided', () => {
    render(
      <ProviderImageFallback
        providerName="Test Provider"
        categoryId="food"
        providerId="p1"
        backgroundColor="#FBF1D9"
      />,
    );

    const fallback = screen.getByTestId('provider-image-fallback');
    expect(fallback).toHaveStyle('background-color: #FBF1D9');
  });
});
