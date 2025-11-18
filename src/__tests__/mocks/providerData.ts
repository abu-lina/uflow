import type { Provider, SearchResult } from '@/services/providers';

// Mock provider data for testing
export const mockProviders: Provider[] = [
  {
    provider_id: 'bilal-moschee-123',
    provider_name: 'Bilal Moschee',
    description: 'Beautiful mosque in the heart of the city, serving the local Muslim community with daily prayers and educational programs.',
    category_id: 'mosque-category-123',
    address_city: 'Berlin',
    address_street: '123 Hauptstraße',
    address_zip: '10115',
    address_country: 'Germany',
    contact_phone: '+49 30 12345678',
    contact_email: 'info@bilal-moschee.de',
    social_website: 'https://bilal-moschee.de',
    social_instagram: null,
    location_latitude: 52.5200,
    location_longitude: 13.4050,
    provider_images: JSON.stringify({
      urls: [
        'https://pmbatjlosstytdmmqkky.supabase.co/storage/v1/object/public/images/bilal-mosque-1.jpg',
        'https://pmbatjlosstytdmmqkky.supabase.co/storage/v1/object/public/images/bilal-mosque-2.jpg'
      ]
    }),
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    barakah_effects: ['Iman', 'Zakat', 'Sunnah'],
    offers_ids: [],
    needs_ids: [],
    category: {
      name_de: 'Moschee'
    },
  },
  {
    provider_id: 'islamic-center-456',
    provider_name: 'Islamic Center Berlin',
    description: 'Modern Islamic center offering prayer facilities, Islamic education, and community events.',
    category_id: 'islamic-center-category-456',
    address_city: 'Berlin',
    address_street: '456 Friedenstraße',
    address_zip: '10117',
    address_country: 'Germany',
    contact_phone: '+49 30 87654321',
    contact_email: 'contact@islamic-center-berlin.de',
    social_website: 'https://islamic-center-berlin.de',
    social_instagram: null,
    location_latitude: 52.5200,
    location_longitude: 13.4050,
    provider_images: JSON.stringify({
      urls: [
        'https://pmbatjlosstytdmmqkky.supabase.co/storage/v1/object/public/images/islamic-center-1.jpg'
      ]
    }),
    created_at: '2024-01-10T14:00:00Z',
    updated_at: '2024-01-10T14:00:00Z',
    barakah_effects: ['Iman', 'Education'],
    offers_ids: [],
    needs_ids: [],
    category: {
      name_de: 'Islamisches Zentrum'
    },
  },
  {
    provider_id: 'halal-restaurant-789',
    provider_name: 'Halal Delights Restaurant',
    description: 'Authentic halal cuisine serving traditional Middle Eastern and Turkish dishes.',
    category_id: 'restaurant-category-789',
    address_city: 'Hamburg',
    address_street: '789 Essenstraße',
    address_zip: '20095',
    address_country: 'Germany',
    contact_phone: '+49 40 11223344',
    contact_email: 'info@halal-delights.de',
    social_website: 'https://halal-delights.de',
    social_instagram: null,
    location_latitude: 53.5511,
    location_longitude: 9.9937,
    provider_images: JSON.stringify({
      urls: [
        'https://pmbatjlosstytdmmqkky.supabase.co/storage/v1/object/public/images/restaurant-1.jpg'
      ]
    }),
    created_at: '2024-01-05T12:00:00Z',
    updated_at: '2024-01-05T12:00:00Z',
    barakah_effects: ['Sunnah'],
    offers_ids: [],
    needs_ids: [],
    category: {
      name_de: 'Restaurant'
    },
  }
];

// Mock search results
export const mockSearchResults: SearchResult[] = [
  {
    id: mockProviders[0].provider_id,
    name: mockProviders[0].provider_name,
    images: mockProviders[0].provider_images,
    category_id: mockProviders[0].category_id,
    address_city: mockProviders[0].address_city,
    social_website: mockProviders[0].social_website,
    social_instagram: mockProviders[0].social_instagram,
    contact_email: mockProviders[0].contact_email,
    contact_phone: mockProviders[0].contact_phone,
    address_street: mockProviders[0].address_street,
    address_country: mockProviders[0].address_country,
    address_zip: mockProviders[0].address_zip,
    location_latitude: mockProviders[0].location_latitude,
    location_longitude: mockProviders[0].location_longitude,
    created_at: mockProviders[0].created_at,
    updated_at: mockProviders[0].updated_at,
    barakah_effects: mockProviders[0].barakah_effects,
    offers_ids: mockProviders[0].offers_ids,
    needs_ids: mockProviders[0].needs_ids,
    category: mockProviders[0].category,
    type: 'provider',
    originalProvider: mockProviders[0]
  },
  {
    id: mockProviders[1].provider_id,
    name: mockProviders[1].provider_name,
    images: mockProviders[1].provider_images,
    category_id: mockProviders[1].category_id,
    address_city: mockProviders[1].address_city,
    social_website: mockProviders[1].social_website,
    social_instagram: mockProviders[1].social_instagram,
    contact_email: mockProviders[1].contact_email,
    contact_phone: mockProviders[1].contact_phone,
    address_street: mockProviders[1].address_street,
    address_country: mockProviders[1].address_country,
    address_zip: mockProviders[1].address_zip,
    location_latitude: mockProviders[1].location_latitude,
    location_longitude: mockProviders[1].location_longitude,
    created_at: mockProviders[1].created_at,
    updated_at: mockProviders[1].updated_at,
    barakah_effects: mockProviders[1].barakah_effects,
    offers_ids: mockProviders[1].offers_ids,
    needs_ids: mockProviders[1].needs_ids,
    category: mockProviders[1].category,
    type: 'provider',
    originalProvider: mockProviders[1]
  },
  {
    id: mockProviders[2].provider_id,
    name: mockProviders[2].provider_name,
    images: mockProviders[2].provider_images,
    category_id: mockProviders[2].category_id,
    address_city: mockProviders[2].address_city,
    social_website: mockProviders[2].social_website,
    social_instagram: mockProviders[2].social_instagram,
    contact_email: mockProviders[2].contact_email,
    contact_phone: mockProviders[2].contact_phone,
    address_street: mockProviders[2].address_street,
    address_country: mockProviders[2].address_country,
    address_zip: mockProviders[2].address_zip,
    location_latitude: mockProviders[2].location_latitude,
    location_longitude: mockProviders[2].location_longitude,
    created_at: mockProviders[2].created_at,
    updated_at: mockProviders[2].updated_at,
    barakah_effects: mockProviders[2].barakah_effects,
    offers_ids: mockProviders[2].offers_ids,
    needs_ids: mockProviders[2].needs_ids,
    category: mockProviders[2].category,
    type: 'provider',
    originalProvider: mockProviders[2]
  }
];

// Mock filtered results for "Bilal" search
export const mockBilalSearchResults: SearchResult[] = [
  {
    id: mockProviders[0].provider_id,
    name: mockProviders[0].provider_name,
    images: mockProviders[0].provider_images,
    category_id: mockProviders[0].category_id,
    address_city: mockProviders[0].address_city,
    social_website: mockProviders[0].social_website,
    social_instagram: mockProviders[0].social_instagram,
    contact_email: mockProviders[0].contact_email,
    contact_phone: mockProviders[0].contact_phone,
    address_street: mockProviders[0].address_street,
    address_country: mockProviders[0].address_country,
    address_zip: mockProviders[0].address_zip,
    location_latitude: mockProviders[0].location_latitude,
    location_longitude: mockProviders[0].location_longitude,
    created_at: mockProviders[0].created_at,
    updated_at: mockProviders[0].updated_at,
    barakah_effects: mockProviders[0].barakah_effects,
    offers_ids: mockProviders[0].offers_ids,
    needs_ids: mockProviders[0].needs_ids,
    category: mockProviders[0].category,
    type: 'provider',
    originalProvider: mockProviders[0]
  }
];

// Mock user data
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User'
  },
  created_at: '2024-01-01T00:00:00Z'
};

// Mock session data
export const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_at: Date.now() + 3600000, // 1 hour from now
  user: mockUser
};

// Mock search context
export const mockSearchContext = {
  selectedCategory: null,
  setSelectedCategory: () => {},
  searchQuery: '',
  setSearchQuery: () => {},
  selectedLocation: 'Überall',
  setSelectedLocation: () => {}
};

// Mock auth context
export const mockAuthContext = {
  user: mockUser,
  session: mockSession,
  loading: false,
  signIn: () => {},
  signUp: () => {},
  signOut: () => {}
};
