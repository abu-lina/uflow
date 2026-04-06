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
  FooterAction: ({
    actionButton,
  }: {
    actionButton: { label: string; onClick: () => void; 'aria-label': string };
  }) => (
    <button aria-label={actionButton['aria-label']} onClick={actionButton.onClick}>
      {actionButton.label}
    </button>
  ),
}));

import { AdminCommunityServiceDetailButtons } from '@/features/admin/components/AdminCommunityServiceDetailButtons';

describe('AdminCommunityServiceDetailButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders an edit button with mobile variant', () => {
    render(
      <AdminCommunityServiceDetailButtons communityServiceId="test-cs-uuid" variant="mobile" />,
    );

    const button = screen.getByRole('button', { name: 'Edit Service' });
    expect(button).toBeInTheDocument();
  });

  it('renders an edit button with desktop variant', () => {
    render(
      <AdminCommunityServiceDetailButtons communityServiceId="test-cs-uuid" variant="desktop" />,
    );

    const button = screen.getByRole('button', { name: 'Edit Service' });
    expect(button).toBeInTheDocument();
  });

  it('navigates to community service admin edit page on mobile click', () => {
    render(
      <AdminCommunityServiceDetailButtons communityServiceId="abc-123" variant="mobile" />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit Service' }));

    expect(mockPush).toHaveBeenCalledWith('/dashboard/community-services/abc-123/edit');
  });

  it('navigates to community service admin edit page on desktop click', () => {
    render(
      <AdminCommunityServiceDetailButtons communityServiceId="abc-123" variant="desktop" />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit Service' }));

    expect(mockPush).toHaveBeenCalledWith('/dashboard/community-services/abc-123/edit');
  });
});
