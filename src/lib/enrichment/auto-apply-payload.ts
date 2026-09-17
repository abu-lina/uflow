import { detectConflict, type EnrichmentCandidate } from './joinhalal-enricher';

const FOOD_PROVIDER_FIELDS = new Set(['no_alcohol', 'no_pork', 'no_gambling']);

/**
 * Fields that map to the locations table. When any of these are applied,
 * a locations array is built in the RPC payload so the data reaches the
 * locations table (which the UI reads for display).
 */
const LOCATION_FIELDS = new Set([
  'address_street',
  'address_zip',
  'address_city',
  'address_country',
  'location_latitude',
  'location_longitude',
  'opening_hours',
]);

export interface DeliveryLinkInput {
  platform: string;
  platform_url: string;
  platform_slug?: string;
  is_active: boolean;
}

export interface AutoApplyInput {
  providerId: string;
  current: Record<string, unknown>;
  proposed: EnrichmentCandidate[];
}

export interface AutoApplyOutput {
  rpcPayload: Record<string, unknown>;
  deliveryLinks: DeliveryLinkInput[] | null;
  menuItems: Record<string, unknown>[] | null;
  appliedFields: string[];
}

export function buildAutoApplyPayload(input: AutoApplyInput): AutoApplyOutput {
  const providersPayload: Record<string, unknown> = {};
  const foodProvidersPayload: Record<string, unknown> = {};
  let deliveryLinks: DeliveryLinkInput[] | null = null;
  let menuItems: Record<string, unknown>[] | null = null;
  const appliedFields: string[] = [];

  for (const candidate of input.proposed) {
    const { field_name, current_value, proposed_value } = candidate;

    const conflict = detectConflict(current_value, proposed_value);
    if (conflict !== 'additive') continue;

    if (proposed_value === null || proposed_value === undefined || proposed_value === '') continue;

    appliedFields.push(field_name);

    if (field_name === 'delivery_links' && Array.isArray(proposed_value)) {
      deliveryLinks = proposed_value as DeliveryLinkInput[];
    } else if (field_name === 'menu_items' && Array.isArray(proposed_value)) {
      menuItems = proposed_value as Record<string, unknown>[];
    } else if (FOOD_PROVIDER_FIELDS.has(field_name)) {
      foodProvidersPayload[field_name] = proposed_value;
    } else {
      providersPayload[field_name] = proposed_value;
    }
  }

  const rpcPayload: Record<string, unknown> = {};
  if (Object.keys(providersPayload).length > 0) {
    rpcPayload.providers = providersPayload;
  }
  if (Object.keys(foodProvidersPayload).length > 0) {
    rpcPayload.food_providers = foodProvidersPayload;
  }

  // Build locations sub-object when any location-related fields are applied.
  // This writes to the locations table via admin_update_provider RPC,
  // which is where the UI reads address/coordinate data from.
  const locationData: Record<string, unknown> = {};
  for (const field of appliedFields) {
    if (LOCATION_FIELDS.has(field) && field in providersPayload) {
      locationData[field] = providersPayload[field];
    }
  }
  if (Object.keys(locationData).length > 0) {
    locationData.is_primary = true;
    rpcPayload.locations = [locationData];
  }

  return { rpcPayload, deliveryLinks, menuItems, appliedFields };
}
