/**
 * TDD tests for hideSocialInitiatives prop on ProviderEditForm
 * Plan 083 — D9
 *
 * Pre-fix: ProviderEditForm always renders the "Social initiatives" button.
 * Post-fix: When hideSocialInitiatives={true}, the button is hidden.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPush, mockBack } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockBack: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

vi.mock('@iconify/react', () => ({
  Icon: (props: Record<string, unknown>) => <span data-testid="icon" {...props} />,
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ user: { id: 'owner-1' } }),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    language: 'de',
    t: (key: string) => {
      const map: Record<string, string> = {
        'editProvider.basics': 'Grundlagen',
        'editProvider.location': 'Standort',
        'editProvider.contact': 'Kontakt',
        'editProvider.media': 'Media',
        'editProvider.images': 'Bilder',
        'editProvider.uploadImages': 'Bilder hochladen',
        'editProvider.imagesSelected': '{{count}} Bilder ausgewählt',
        'editProvider.socialInitiatives': 'Soziale Initiativen',
        'editProvider.selectInitiatives': 'Initiativen auswählen',
        'editProvider.initiativesSelected': '{{count}} Initiativen ausgewählt',
        'editProvider.titleField': 'Titel',
        'editProvider.description': 'Beschreibung',
        'editProvider.category': 'Kategorie',
        'editProvider.onlineBusiness': 'Online',
        'editProvider.website': 'Webseite',
        'editProvider.email': 'E-Mail',
        'editProvider.phone': 'Telefon',
        'editProvider.instagram': 'Instagram',
        'editProvider.street': 'Straße',
        'editProvider.zipCode': 'PLZ',
        'editProvider.city': 'Stadt',
        'editProvider.country': 'Land',
        'editProvider.save': 'Speichern',
        'editProvider.saveChanges': 'Änderungen speichern',
        'editProvider.discardChanges': 'Verwerfen',
        'editProvider.back': 'Zurück',
        'editProvider.whatDoIOffer': 'Was biete ich an?',
        'editProvider.whatDoINeed': 'Was benötige ich?',
        'editProvider.offersSelected': '{{count}} Angebote ausgewählt',
        'editProvider.needsSelected': '{{count}} Bedarfe ausgewählt',
        'editProvider.selectOffers': 'Angebote auswählen',
        'editProvider.selectNeeds': 'Bedarfe auswählen',
        'editProvider.mustBeLoggedIn': 'Einloggen erforderlich',
        'editProvider.errorUpdating': 'Fehler beim Aktualisieren',
        'providers.selectCategory': 'Kategorie auswählen',
        'editProvider.noPhysicalLocation': 'Kein physischer Standort',
        'editProvider.onlineBusinessDisplay': 'Nur online',
        'editProvider.streetPlaceholder': 'Straße',
        'editProvider.zipCodePlaceholder': 'PLZ',
        'editProvider.cityPlaceholder': 'Stadt',
        'editProvider.countryPlaceholder': 'Land',
        'editProvider.websitePlaceholder': 'Webseite',
        'editProvider.instagramPlaceholder': 'Instagram',
        'editProvider.emailPlaceholder': 'E-Mail',
        'editProvider.phonePlaceholder': 'Telefon',
        'editProvider.titlePlaceholder': 'Titel eingeben',
        'editProvider.descriptionPlaceholder': 'Beschreibung eingeben',
      };
      return map[key] ?? key;
    },
  }),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    })),
  },
}));

vi.mock('@/services/communityServices', () => ({
  createProviderCommunityServiceRelationship: vi.fn(),
}));

vi.mock('@/components/ui/FooterAction', () => ({
  FooterAction: () => <div data-testid="footer-action" />,
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

import { ProviderEditForm } from '@/components/providers/ProviderEditForm';

const mockProvider = {
  provider_id: 'test-provider-id',
  provider_name: 'Test Service',
  provider_description: 'A great service',
  provider_images: null,
  category_id: null,
  address_city: null,
  address_street: null,
  address_zip: null,
  address_country: null,
  contact_email: null,
  contact_phone: null,
  social_website: null,
  social_instagram: null,
  location_latitude: null,
  location_longitude: null,
  review_status: 'pending' as const,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  barakah_effects: [],
  offers_ids: [],
  needs_ids: [],
  show_address: true,
};

describe('ProviderEditForm — hideSocialInitiatives prop (Plan 083 D9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('[pre-fix FAILS] Soziale Initiativen button visible by default (hideSocialInitiatives=false)', () => {
    render(
      <ProviderEditForm
        enableLocalStorage={false}
        localStoragePrefix="test_"
        provider={mockProvider}
        subPageBaseUrl="/dashboard/test/edit"
      />
    );

    // Default: Soziale Initiativen button MUST be visible
    expect(screen.getByText('Soziale Initiativen')).toBeInTheDocument();
  });

  it('[pre-fix FAILS] Soziale Initiativen button hidden when hideSocialInitiatives=true', () => {
    render(
      <ProviderEditForm
        enableLocalStorage={false}
        hideSocialInitiatives={true}
        localStoragePrefix="test_"
        provider={mockProvider}
        subPageBaseUrl="/dashboard/test/edit"
      />
    );

    // With hideSocialInitiatives=true: button MUST NOT be in the DOM
    expect(screen.queryByText('Soziale Initiativen')).not.toBeInTheDocument();
  });

  it('[post-fix PASSES] Default (hideSocialInitiatives=false) shows Soziale Initiativen button', () => {
    render(
      <ProviderEditForm
        enableLocalStorage={false}
        hideSocialInitiatives={false}
        localStoragePrefix="test_"
        provider={mockProvider}
        subPageBaseUrl="/dashboard/test/edit"
      />
    );

    expect(screen.getByText('Soziale Initiativen')).toBeInTheDocument();
  });
});
