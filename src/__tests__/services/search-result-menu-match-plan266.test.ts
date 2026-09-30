import { describe, expect, it } from 'vitest';
import { transformProviderToSearchResult, type Provider } from '@/services/providers/types';

describe('Plan 266 matched menu items', () => {
  it('[pre-fix FAILS] preserves matched menu item names in SearchResult', () => {
    const provider = {
      provider_id: 'provider-1',
      provider_name: 'Istanbul Grill',
      provider_images: null,
      category_id: null,
      address_city: 'Berlin',
      social_website: null,
      social_instagram: null,
      contact_email: null,
      contact_phone: null,
      address_street: null,
      address_country: null,
      address_zip: null,
      location_latitude: null,
      location_longitude: null,
      created_at: null,
      updated_at: null,
      offers_ids: [],
      needs_ids: [],
      matched_menu_items: ['Lahmacun'],
    } as Provider;

    expect(transformProviderToSearchResult(provider).matched_menu_items).toEqual(['Lahmacun']);
  });
});
