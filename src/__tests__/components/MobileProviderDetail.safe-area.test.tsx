import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../utils/test-utils';
import { MobileProviderDetail } from '@/features/providers/components/MobileProviderDetail';
import { mockProviders } from '../mocks/providerData';

describe('MobileProviderDetail safe-area top gap regression', () => {
  const mockProvider = mockProviders[0];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[post-fix PASSES] outer wrapper includes safe-area-inset-top in padding-top', () => {
    const { container } = render(<MobileProviderDetail provider={mockProvider} />);

    // The outermost div of MobileProviderDetail should use safe-area-aware padding
    // Pre-fix: uses fixed pt-6 (24px) with no env(safe-area-inset-top)
    // Post-fix: uses pt-[calc(env(safe-area-inset-top)+24px)] or equivalent
    const outerDiv = container.firstElementChild as HTMLElement;
    expect(outerDiv).toBeTruthy();

    const className = outerDiv.className;

    // The class should contain a safe-area-inset-top calc expression, NOT bare pt-6
    expect(className).toContain('safe-area-inset-top');
    expect(className).not.toMatch(/\bpt-6\b/);
  });

  it('[post-fix PASSES] preserves existing layout classes on outer wrapper', () => {
    const { container } = render(<MobileProviderDetail provider={mockProvider} />);

    const outerDiv = container.firstElementChild as HTMLElement;
    expect(outerDiv).toBeTruthy();

    const className = outerDiv.className;

    // These existing classes must be preserved
    expect(className).toContain('flex');
    expect(className).toContain('w-full');
    expect(className).toContain('flex-col');
    expect(className).toContain('px-6');
  });
});
