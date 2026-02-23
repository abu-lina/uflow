import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

// Mock the LoadingProvider
vi.mock('@/providers/LoadingProvider', () => ({
  useLoading: () => ({ isPreloading: false }),
}));

import { PageTransition } from '@/components/ui/PageTransition';

describe('PageTransition', () => {
  it('renders children', () => {
    const { getByText } = render(
      <PageTransition>
        <div>Test Content</div>
      </PageTransition>
    );
    expect(getByText('Test Content')).toBeInTheDocument();
  });

  it('establishes a positioned containing block with position:relative', () => {
    // Plan 015: ScrollablePageLayout uses `absolute inset-0` which resolves
    // to the nearest positioned ancestor. PageTransition MUST be positioned
    // (relative) so that absolute children resolve to it, not a distant ancestor.
    // Without this, on MIUI WebView the form fields can collapse to zero height.
    const { container } = render(
      <PageTransition>
        <div>Content</div>
      </PageTransition>
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveClass('relative');
  });

  it('uses flex layout for proper child sizing', () => {
    const { container } = render(
      <PageTransition>
        <div>Content</div>
      </PageTransition>
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveClass('flex');
    expect(wrapper).toHaveClass('flex-1');
    expect(wrapper).toHaveClass('flex-col');
  });

  it('shows content when not preloading', () => {
    const { getByText } = render(
      <PageTransition>
        <div>Visible Content</div>
      </PageTransition>
    );
    expect(getByText('Visible Content')).toBeInTheDocument();
  });
});
