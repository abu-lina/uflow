import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../utils/test-utils';
import { EndorseBadgeButton } from '@/components/providers/EndorseBadgeButton';
import type { BadgeWithConfirmationStatus } from '@/types/badges';
import { TrustLevel, EntityType, BadgeKey } from '@/types/badges';

// Mock the badges service
vi.mock('@/services/badges', () => ({
  confirmBadge: vi.fn().mockResolvedValue({
    success: true,
    trust_level: 'COMMUNITY_CONFIRMED',
    already_confirmed: false,
  }),
  revokeConfirmation: vi.fn().mockResolvedValue({
    success: true,
    trust_level: 'SELF_DECLARED',
  }),
}));

const mockBadge: BadgeWithConfirmationStatus = {
  id: 'badge-1',
  entity_id: 'provider-123',
  entity_type: EntityType.PROVIDER,
  badge_type_id: 'bt-1',
  trust_level: TrustLevel.COMMUNITY_CONFIRMED,
  confirmation_count: 5,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  user_has_confirmed: false,
  badge_type: {
    id: 'bt-1',
    badge_key: BadgeKey.HALAL,
    labels: { de: 'Halal', en: 'Halal' },
    description: null,
    icon_name: 'halal',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
};

describe('EndorseBadgeButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Unauthenticated user', () => {
    it('should render a confirm button that indicates login is required', () => {
      render(<EndorseBadgeButton badge={mockBadge} userId={null} onEndorsementChange={vi.fn()} />);
      const button = screen.getByRole('button', { name: /confirm|bestätigen/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Authenticated user - not yet confirmed', () => {
    it('should render confirm button', () => {
      render(
        <EndorseBadgeButton badge={mockBadge} userId="user-123" onEndorsementChange={vi.fn()} />,
      );
      const button = screen.getByRole('button', { name: /confirm|bestätigen/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Authenticated user - already confirmed', () => {
    it('should render confirmed state button', () => {
      const confirmedBadge = { ...mockBadge, user_has_confirmed: true };
      render(
        <EndorseBadgeButton
          badge={confirmedBadge}
          userId="user-123"
          onEndorsementChange={vi.fn()}
        />,
      );
      // Should show "confirmed" or "bestätigt" state
      const button = screen.getByRole('button', { name: /confirmed|bestätigt|revoke|widerrufen/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible label describing the action', () => {
      render(
        <EndorseBadgeButton badge={mockBadge} userId="user-123" onEndorsementChange={vi.fn()} />,
      );
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label');
    });
  });
});
