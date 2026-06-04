export interface ProviderDeliveryLink {
  provider_id: string;
  platform: 'wolt' | 'lieferando' | 'ubereats';
  platform_url: string;
  platform_slug: string | null;
  is_active: boolean;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export type DeliveryPlatform = 'wolt' | 'lieferando' | 'ubereats';
