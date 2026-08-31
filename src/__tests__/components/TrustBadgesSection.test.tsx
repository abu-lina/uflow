import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../utils/test-utils';
import { TrustBadgesSection } from '@/features/providers/components/TrustBadgesSection';
import type { BadgeWithConfirmationStatus } from '@/types/badges';
import { TrustLevel, EntityType, BadgeKey } from '@/types/badges';

// Mock badge data
const mockBadges: BadgeWithConfirmationStatus[] = [
  {
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
  },
  {
    id: 'badge-2',
    entity_id: 'provider-123',
    entity_type: EntityType.PROVIDER,
    badge_type_id: 'bt-2',
    trust_level: TrustLevel.SELF_DECLARED,
    confirmation_count: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user_has_confirmed: false,
    badge_type: {
      id: 'bt-2',
      badge_key: BadgeKey.MUSLIM_OWNED,
      labels: { de: 'Muslimisch geführt', en: 'Muslim Owned' },
      description: null,
      icon_name: 'muslim-owned',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
  {
    id: 'badge-3',
    entity_id: 'provider-123',
    entity_type: EntityType.PROVIDER,
    badge_type_id: 'bt-3',
    trust_level: TrustLevel.UMMAH_FLOW_VERIFIED,
    confirmation_count: 10,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    user_has_confirmed: true,
    badge_type: {
      id: 'bt-3',
      badge_key: BadgeKey.FAMILY_FRIENDLY,
      labels: { de: 'Familienfreundlich', en: 'Family Friendly' },
      description: null,
      icon_name: 'family-friendly',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  },
];

describe('TrustBadgesSection', () => {
  describe('Rendering with badges', () => {
    it('should render the section heading', () => {
      render(<TrustBadgesSection badges={mockBadges} isLoading={false} />);
      // Heading should be present (de locale by default in test)
      expect(screen.getByText(/Trust|Vertrauen/i)).toBeInTheDocument();
    });

    it('should render all badge labels', () => {
      render(<TrustBadgesSection badges={mockBadges} isLoading={false} />);
      // BadgeLabel renders uppercase short labels (de or en depending on detected locale)
      expect(screen.getByText('HALAL')).toBeInTheDocument();
      expect(screen.getByText('MUSLIM')).toBeInTheDocument();
      // FAMILY (en) or FAMILIE (de) depending on locale
      expect(screen.getByText(/FAMILY|FAMILIE/)).toBeInTheDocument();
    });

    it('should show aggregate confirmation counts', () => {
      render(<TrustBadgesSection badges={mockBadges} isLoading={false} />);
      // Should show confirmation counts as aggregates (not individual user data)
      // de: "Bestätigungen" / en: "confirmations"
      expect(screen.getByText(/5\s+(confirmation|Bestätigung)/)).toBeInTheDocument();
      expect(screen.getByText(/10\s+(confirmation|Bestätigung)/)).toBeInTheDocument();
    });

    it('should have proper ARIA roles for accessibility', () => {
      render(<TrustBadgesSection badges={mockBadges} isLoading={false} />);
      // Each BadgeLabel has role="status"
      const statusElements = screen.getAllByRole('status');
      expect(statusElements.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Empty state', () => {
    it('should not render when no badges exist', () => {
      const { container } = render(<TrustBadgesSection badges={[]} isLoading={false} />);
      // Should not render the section at all when there are no badges
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Loading state', () => {
    it('should render loading skeleton when isLoading is true', () => {
      render(<TrustBadgesSection badges={[]} isLoading={true} />);
      // Should show loading indicator
      const loadingElement = screen.getByTestId('trust-badges-loading');
      expect(loadingElement).toBeInTheDocument();
    });
  });
});
