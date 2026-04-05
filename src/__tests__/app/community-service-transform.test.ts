/**
 * TDD tests for buildProviderShapeFromCommunityService transform (Plan 082)
 * 
 * Tests written BEFORE the function was implemented.
 * Red → Green verified per TDD gate procedure.
 */
import { describe, it, expect } from 'vitest';

// Import BEFORE implementation exists — will fail with ImportError until added
import { buildProviderShapeFromCommunityService } from '@/app/(public)/community-services/[community_service_id]/CommunityServiceDetailPageClient';
import type { CommunityService } from '@/services/communityServices';
import { EntityType } from '@/types/badges';

const baseService: CommunityService = {
  community_service_id: 'cs-42',
  community_service_name: 'Zakat Foundation',
  community_service_description: 'We provide zakat support',
  community_service_images: ['https://mock-supabase-url.com/img1.jpg'],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  barakah_effects: ['effect1'],
  offers_ids: ['offer-1'],
  needs_ids: ['need-1'],
  offers: [{ name_de: 'Beratung' }],
  needs: [{ name_de: 'Spenden' }],
  category_id: 'cat-1',
  category: { name_de: 'Moscheeverein', name_en: 'Mosque', category_images: {} },
  address_city: 'Berlin',
  address_street: 'Musterstraße 1',
  address_zip: '10115',
  address_country: 'DE',
  contact_email: 'test@example.com',
  contact_phone: '+49 30 12345',
  social_website: 'https://example.com',
  social_instagram: 'example_ig',
  location_latitude: 52.5,
  location_longitude: 13.4,
  show_address: true,
};

describe('buildProviderShapeFromCommunityService (Plan 082)', () => {
  it('[post-fix PASSES] exports buildProviderShapeFromCommunityService', () => {
    expect(typeof buildProviderShapeFromCommunityService).toBe('function');
  });

  it('[post-fix PASSES] maps community_service_id to both provider_id and community_service_id', () => {
    const result = buildProviderShapeFromCommunityService(baseService);
    // provider_id must equal community_service_id so modal actions use right ID
    expect(result.provider_id).toBe('cs-42');
    // community_service_id must be set so ProviderDetailModal detects entity type
    expect(result.community_service_id).toBe('cs-42');
  });

  it('[post-fix PASSES] maps community_service_name to provider_name', () => {
    const result = buildProviderShapeFromCommunityService(baseService);
    expect(result.provider_name).toBe('Zakat Foundation');
  });

  it('[post-fix PASSES] maps community_service_description to description', () => {
    // F6 fix: description must be mapped so it can be rendered if/when shown
    const result = buildProviderShapeFromCommunityService(baseService);
    expect(result.description).toBe('We provide zakat support');
  });

  it('[post-fix PASSES] maps description to null when not provided', () => {
    const noDesc = { ...baseService, community_service_description: undefined };
    const result = buildProviderShapeFromCommunityService(noDesc);
    expect(result.description).toBeNull();
  });

  it('[post-fix PASSES] encodes images as JSON string for ProviderDetailModal compatibility', () => {
    const result = buildProviderShapeFromCommunityService(baseService);
    // ProviderDetailModal parses: JSON.parse(provider.provider_images) → { urls: [...] }
    const parsed = JSON.parse(result.provider_images as string) as { urls: string[] };
    expect(parsed.urls).toEqual(['https://mock-supabase-url.com/img1.jpg']);
  });

  it('[post-fix PASSES] sets provider_images to null when no images', () => {
    const noImages = { ...baseService, community_service_images: undefined };
    const result = buildProviderShapeFromCommunityService(noImages);
    expect(result.provider_images).toBeNull();
  });

  it('[post-fix PASSES] maps all contact and address fields', () => {
    const result = buildProviderShapeFromCommunityService(baseService);
    expect(result.contact_email).toBe('test@example.com');
    expect(result.contact_phone).toBe('+49 30 12345');
    expect(result.social_website).toBe('https://example.com');
    expect(result.social_instagram).toBe('example_ig');
    expect(result.address_city).toBe('Berlin');
    expect(result.address_street).toBe('Musterstraße 1');
    expect(result.address_zip).toBe('10115');
    expect(result.address_country).toBe('DE');
  });

  it('[post-fix PASSES] maps offers and needs arrays', () => {
    const result = buildProviderShapeFromCommunityService(baseService);
    expect(result.offers).toEqual([{ name_de: 'Beratung' }]);
    expect(result.needs).toEqual([{ name_de: 'Spenden' }]);
  });

  it('[post-fix PASSES] maps badge data for trust section', () => {
    const withBadges: CommunityService = {
      ...baseService,
      badges: [{
        id: 'badge-1',
        entity_id: 'cs-42',
        entity_type: EntityType.COMMUNITY_SERVICE,
        badge_type_id: 'bt-1',
        trust_level: 'verified' as import('@/types/badges').TrustLevel,
        confirmation_count: 0,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        badge_type: {
          id: 'bt-1',
          badge_key: 'HALAL' as import('@/types/badges').BadgeKey,
          labels: { de: 'Halal', en: 'Halal' },
          description: null,
          icon_name: 'halal-icon',
          is_active: true,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      }],
    };
    const result = buildProviderShapeFromCommunityService(withBadges);
    expect(result.badges).toHaveLength(1);
    expect(result.badges![0]!.id).toBe('badge-1');
  });

  it('[post-fix PASSES] defaults arrays to [] when not present', () => {
    const minimal: CommunityService = {
      community_service_id: 'cs-min',
      community_service_name: 'Minimal',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };
    const result = buildProviderShapeFromCommunityService(minimal);
    expect(result.barakah_effects).toEqual([]);
    expect(result.offers_ids).toEqual([]);
    expect(result.needs_ids).toEqual([]);
    expect(result.offers).toEqual([]);
    expect(result.needs).toEqual([]);
    expect(result.badges).toEqual([]);
  });
});
