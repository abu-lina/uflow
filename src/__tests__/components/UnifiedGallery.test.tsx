import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock next/image to support onError callback for fallback testing
vi.mock('next/image', () => ({
  default: function MockNextImage({
    src,
    alt,
    onError,
    fill: _fill,
    priority,
    sizes,
    quality: _quality,
    placeholder: _placeholder,
    blurDataURL: _blurDataURL,
    onLoadingComplete: _onLoadingComplete,
    loading: _loading,
    ...props
  }: Record<string, unknown>) {
    return (
      <img
        src={String(src || '')}
        alt={String(alt || '')}
        {...(sizes ? { sizes: String(sizes) } : {})}
        {...(priority ? { 'data-priority': 'true' } : {})}
        {...(typeof onError === 'function'
          ? { onError: onError as React.ReactEventHandler<HTMLImageElement> }
          : {})}
        {...props}
      />
    );
  },
}));

// Mock the useImageFallback hook to control test data
vi.mock('@/hooks/useImageFallback', () => ({
  useImageFallback: vi.fn(),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string, params?: { index?: number }) => {
      if (key === 'providers.categoryImage') {
        return `Category image ${params?.index}`;
      }
      if (key === 'providers.providerImage') {
        return `Provider image ${params?.index}`;
      }
      if (key === 'providers.placeholderImage') {
        return `Placeholder image ${params?.index}`;
      }
      if (key === 'providers.communityServiceImage') {
        return `Community service image ${params?.index}`;
      }
      if (key === 'providers.failedToLoadImages') {
        return 'Failed to load images';
      }

      return key;
    },
  }),
}));

// Mock the entityTypeUtils
vi.mock('@/utils/entityTypeUtils', () => ({
  getEntityTypeForCategory: vi.fn(() => 'provider'),
}));

import UnifiedGallery from '@/components/shared/UnifiedGallery';
import { useImageFallback } from '@/hooks/useImageFallback';

const mockUseImageFallback = vi.mocked(useImageFallback);

describe('UnifiedGallery — image error fallback [Plan 055]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[pre-fix FAILS] broken remote image shows broken img instead of placeholder', () => {
    // Simulate the exact production scenario: hook returns a broken remote URL
    mockUseImageFallback.mockReturnValue({
      images: [
        'https://rdtdtcfntopcxcigkqoq.supabase.co/storage/v1/object/public/category-images/a65-design-2NLeXS3NR5E-unsplash.jpg',
        '/images/placeholder.jpg',
        '/images/placeholder.jpg',
      ],
      loading: false,
      error: null,
    });

    render(
      <UnifiedGallery categoryId="49563bf0-6962-4fd8-9147-5e68e9310eb1" entityType="provider" />,
    );

    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);

    // Simulate the broken image error event on the first (remote) image
    fireEvent.error(images[0]);

    // After onError fires, the src should have changed to placeholder
    // PRE-FIX: This assertion FAILS because there is no onError handler
    expect(images[0]).toHaveAttribute('src', '/images/placeholder.jpg');
  });

  it('[post-fix PASSES] broken remote image falls back to placeholder on error', () => {
    mockUseImageFallback.mockReturnValue({
      images: [
        'https://example.com/broken-image.jpg',
        'https://example.com/valid-image.jpg',
        '/images/placeholder.jpg',
      ],
      loading: false,
      error: null,
    });

    render(<UnifiedGallery categoryId="test-category-id" entityType="provider" />);

    const images = screen.getAllByRole('img');

    // First image is a broken remote URL
    expect(images[0]).toHaveAttribute('src', 'https://example.com/broken-image.jpg');

    // Simulate image load error
    fireEvent.error(images[0]);

    // After error, src should be the placeholder
    expect(images[0]).toHaveAttribute('src', '/images/placeholder.jpg');

    // Second image should remain unchanged (no error fired)
    expect(images[1]).toHaveAttribute('src', 'https://example.com/valid-image.jpg');
  });

  it('[post-fix PASSES] already-placeholder image does not re-trigger fallback', () => {
    mockUseImageFallback.mockReturnValue({
      images: ['/images/placeholder.jpg', '/images/placeholder.jpg', '/images/placeholder.jpg'],
      loading: false,
      error: null,
    });

    render(<UnifiedGallery categoryId="test-category-id" entityType="provider" />);

    const images = screen.getAllByRole('img');

    // Already a placeholder — onError should not cause issues
    fireEvent.error(images[0]);
    expect(images[0]).toHaveAttribute('src', '/images/placeholder.jpg');
  });

  it('renders valid images without modification when no error occurs', () => {
    mockUseImageFallback.mockReturnValue({
      images: [
        'https://example.com/valid1.jpg',
        'https://example.com/valid2.jpg',
        'https://example.com/valid3.jpg',
      ],
      loading: false,
      error: null,
    });

    render(<UnifiedGallery categoryId="test-category-id" entityType="provider" />);

    const images = screen.getAllByRole('img');
    expect(images[0]).toHaveAttribute('src', 'https://example.com/valid1.jpg');
    expect(images[1]).toHaveAttribute('src', 'https://example.com/valid2.jpg');
    expect(images[2]).toHaveAttribute('src', 'https://example.com/valid3.jpg');
  });

  it('[Plan 122] renders category Storage images with object-cover (no static image detection)', () => {
    mockUseImageFallback.mockReturnValue({
      images: [
        'https://rdtdtcfntopcxcigkqoq.supabase.co/storage/v1/object/public/category-images/232c2870/1.webp',
        '/images/placeholder.jpg',
        '/images/placeholder.jpg',
      ],
      loading: false,
      error: null,
    });

    render(<UnifiedGallery categoryId="category-palette-test" entityType="provider" />);

    const categoryImage = screen.getByAltText('Category image 1');
    // Plan 122: all images use object-cover — no special contain/padding for category images
    expect(categoryImage.className).toContain('object-cover');
    expect(categoryImage.className).not.toContain('object-contain');
    // No palette background coloring on container either
    expect((categoryImage.parentElement as HTMLElement).style.backgroundColor).toBe('');
  });

  it('renders localized error text from hook translation key', () => {
    mockUseImageFallback.mockReturnValue({
      images: [],
      loading: false,
      error: 'providers.failedToLoadImages',
    });

    render(<UnifiedGallery categoryId="test-category-id" entityType="provider" />);

    expect(screen.getByText('Failed to load images')).toBeInTheDocument();
  });
});
