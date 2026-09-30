// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('@/config/feature-flags', () => ({
  getFeatureFlag: () => true,
}));

vi.mock('@/features/chat/components/ChatWidget', () => ({
  ChatWidget: () => null,
}));

import ChatPage from '@/app/(public)/chat/page';

describe('ChatPage i18n (Code Review 264 HIGH-1/HIGH-2)', () => {
  it('renders the heading and close label via translation keys', () => {
    render(<ChatPage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('chat.pageTitle');
    expect(screen.getByRole('button', { name: 'common.close' })).toBeInTheDocument();
  });
});
