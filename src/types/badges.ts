/**
 * Badge and Trust System TypeScript Types
 * Defines all types for the badge system including badge types, confirmations, and verifications
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Trust levels for badges
 * - SELF_DECLARED: Badge was self-declared by the provider (default)
 * - COMMUNITY_CONFIRMED: Badge reached the confirmation threshold (N users confirmed)
 * - UMMAH_FLOW_VERIFIED: Badge was manually verified by admins (highest trust)
 */
export enum TrustLevel {
  SELF_DECLARED = 'SELF_DECLARED',
  COMMUNITY_CONFIRMED = 'COMMUNITY_CONFIRMED',
  UMMAH_FLOW_VERIFIED = 'UMMAH_FLOW_VERIFIED',
}

/**
 * Entity types that can have badges
 */
export enum EntityType {
  PROVIDER = 'provider',
  COMMUNITY_SERVICE = 'community_service',
}

/**
 * Badge keys (types of badges available)
 */
export enum BadgeKey {
  HALAL = 'HALAL',
  MUSLIM_OWNED = 'MUSLIM_OWNED',
  COMMUNITY_ACTIVE = 'COMMUNITY_ACTIVE',
  SUPPORTS_SADAQAH = 'SUPPORTS_SADAQAH',
  PRAYER_FRIENDLY = 'PRAYER_FRIENDLY',
  FAMILY_FRIENDLY = 'FAMILY_FRIENDLY',
  WOMEN_FRIENDLY = 'WOMEN_FRIENDLY',
}

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Badge Type - Defines a type of badge (e.g., HALAL, MUSLIM_OWNED)
 */
export interface BadgeType {
  id: string;
  badge_key: BadgeKey;
  labels: {
    de: string;
    en: string;
    [key: string]: string; // Allow additional languages
  };
  description: string | null;
  icon_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Provider Badge - A badge instance assigned to a provider or community service
 */
export interface ProviderBadge {
  id: string;
  entity_id: string; // provider_id or community_service_id
  entity_type: EntityType;
  badge_type_id: string;
  trust_level: TrustLevel;
  confirmation_count: number;
  created_at: string;
  updated_at: string;
  
  // Joined data (when fetching with relations)
  badge_type?: BadgeType;
}

/**
 * Badge Confirmation - A user's confirmation of a badge
 */
export interface BadgeConfirmation {
  id: string;
  provider_badge_id: string;
  user_id: string;
  confirmed_at: string;
}

/**
 * Badge Verification - Admin verification audit record
 */
export interface BadgeVerification {
  id: string;
  provider_badge_id: string;
  verified_by_user_id: string;
  reason: string | null;
  verified_at: string;
}

/**
 * Badge System Configuration
 */
export interface BadgeSystemConfig {
  config_key: string;
  config_value: {
    confirmation_threshold?: number;
    rate_limit_per_hour?: number;
    [key: string]: unknown;
  };
  updated_at: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Request to confirm a badge
 */
export interface ConfirmBadgeRequest {
  badgeId: string;
  userId: string;
}

/**
 * Response when confirming a badge
 */
export interface ConfirmBadgeResponse {
  id: string;
  trust_level: TrustLevel;
  confirmed: boolean;
  confirmation_count?: number; // Optional, may not be exposed to clients
}

/**
 * Request to revoke a badge confirmation
 */
export interface RevokeBadgeRequest {
  badgeId: string;
  userId: string;
}

/**
 * Response when revoking a badge confirmation
 */
export interface RevokeBadgeResponse {
  success: boolean;
  trust_level: TrustLevel;
  confirmation_count?: number;
}

/**
 * Request to verify a badge (admin only)
 */
export interface VerifyBadgeRequest {
  badgeId: string;
  adminUserId: string;
  reason?: string;
}

/**
 * Response when verifying a badge
 */
export interface VerifyBadgeResponse {
  id: string;
  trust_level: TrustLevel;
  verification: BadgeVerification;
}

/**
 * Request to unverify a badge (admin only)
 */
export interface UnverifyBadgeRequest {
  badgeId: string;
  adminUserId: string;
}

/**
 * Response when unverifying a badge
 */
export interface UnverifyBadgeResponse {
  success: boolean;
  trust_level: TrustLevel;
}

/**
 * Response for getting badges for an entity
 */
export interface GetEntityBadgesResponse {
  data: ProviderBadgeWithType[];
  error: string | null;
}

/**
 * Provider Badge with Badge Type information
 * Used when fetching badges for display
 */
export interface ProviderBadgeWithType extends ProviderBadge {
  badge_type: BadgeType;
}

/**
 * Badge with user confirmation status
 * Used to show if the current user has confirmed a badge
 */
export interface BadgeWithConfirmationStatus extends ProviderBadgeWithType {
  user_has_confirmed: boolean;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Create Provider Badge input (for adding new badges to entities)
 */
export interface CreateProviderBadgeInput {
  entity_id: string;
  entity_type: EntityType;
  badge_type_id: string;
}

/**
 * Update Provider Badge input
 */
export interface UpdateProviderBadgeInput {
  trust_level?: TrustLevel;
  confirmation_count?: number;
}

/**
 * Badge statistics for an entity
 */
export interface BadgeStats {
  total_badges: number;
  self_declared: number;
  community_confirmed: number;
  ummah_flow_verified: number;
  total_confirmations: number;
}

/**
 * Badge with confirmation details (for admin views)
 */
export interface BadgeWithDetails extends ProviderBadgeWithType {
  confirmations: BadgeConfirmation[];
  verifications: BadgeVerification[];
  stats: {
    confirmation_count: number;
    unique_confirmers: number;
  };
}







