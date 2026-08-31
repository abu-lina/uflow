import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../utils/test-utils';
import { ProviderDetailPage } from '@/features/providers/pages/ProviderDetailPage';
import { mockProviders } from '../mocks/providerData';

describe('ProviderDetailPage Hero Image Performance', () => {
  const mockProvider = mockProviders[0]; // Bilal Moschee (has 2 images)

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set sizes attribute on hero image for responsive layout', () => {
    render(<ProviderDetailPage provider={mockProvider} />);

    const heroImage = screen.getByAltText('Bilal Moschee 1');
    expect(heroImage).toHaveAttribute('sizes', '(min-width: 1024px) 50vw, 100vw');
  });

  it('should set priority on the first hero image', () => {
    render(<ProviderDetailPage provider={mockProvider} />);

    const heroImage = screen.getByAltText('Bilal Moschee 1');
    expect(heroImage).toHaveAttribute('data-priority', 'true');
  });
});
