import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock language provider
vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'editProvider.title': 'Edit Service',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock FooterAction
vi.mock('@/components/ui/FooterAction', () => ({
  FooterAction: ({ actionButton }: { actionButton: { label: string; onClick: () => void; 'aria-label': string } }) => (
    <button aria-label={actionButton['aria-label']} onClick={actionButton.onClick}>
      {actionButton.label}
    </button>
  ),
}));

import { AdminProviderDetailButtons } from '@/features/admin/components/AdminProviderDetailButtons';

describe('AdminProviderDetailButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders an edit button with mobile variant', () => {
    render(<AdminProviderDetailButtons providerId="test-uuid" variant="mobile" />);

    const button = screen.getByRole('button', { name: 'Edit Service' });
    expect(button).toBeInTheDocument();
  });

  it('renders an edit button with desktop variant', () => {
    render(<AdminProviderDetailButtons providerId="test-uuid" variant="desktop" />);

    const button = screen.getByRole('button', { name: 'Edit Service' });
    expect(button).toBeInTheDocument();
  });

  it('navigates to admin edit page on mobile click', () => {
    render(<AdminProviderDetailButtons providerId="abc-123" variant="mobile" />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit Service' }));

    expect(mockPush).toHaveBeenCalledWith('/dashboard/providers/abc-123/edit');
  });

  it('navigates to admin edit page on desktop click', () => {
    render(<AdminProviderDetailButtons providerId="abc-123" variant="desktop" />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit Service' }));

    expect(mockPush).toHaveBeenCalledWith('/dashboard/providers/abc-123/edit');
  });

  it('uses provider ID in the edit URL path', () => {
    const specificId = 'provider-uuid-999';
    render(<AdminProviderDetailButtons providerId={specificId} variant="desktop" />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit Service' }));

    expect(mockPush).toHaveBeenCalledWith(`/dashboard/providers/${specificId}/edit`);
  });
});
