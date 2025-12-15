/**
 * Badge Hooks
 * React hooks for managing badge operations in the frontend
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  EntityType,
  BadgeType,
  BadgeWithConfirmationStatus,
} from '@/types/badges';

// ============================================================================
// BADGE FETCHING HOOKS
// ============================================================================

/**
 * Hook to fetch badges for an entity (provider or community_service)
 * @param entityId - The entity ID
 * @param entityType - The entity type
 * @param enabled - Whether to enable the query (default: true)
 */
export function useBadges(
  entityId: string | null | undefined,
  entityType: EntityType,
  enabled: boolean = true
) {
  const [badges, setBadges] = useState<BadgeWithConfirmationStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBadges = useCallback(async () => {
    if (!entityId || !enabled) {
      setBadges([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/badges/entity?entityId=${entityId}&entityType=${entityType}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch badges');
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setBadges(result.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch badges';
      setError(errorMessage);
      console.error('[useBadges] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType, enabled]);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  return {
    badges,
    loading,
    error,
    refetch: fetchBadges,
  };
}

/**
 * Hook to fetch all available badge types
 */
export function useBadgeTypes() {
  const [badgeTypes, setBadgeTypes] = useState<BadgeType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBadgeTypes() {
      setLoading(true);
      setError(null);

      try {
        // This would typically be an API endpoint, but for now we'll use the service directly
        // In a production setup, you'd create a GET /api/badges/types endpoint
        const { getBadgeTypes } = await import('@/services/badges');
        const types = await getBadgeTypes();
        setBadgeTypes(types);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch badge types';
        setError(errorMessage);
        console.error('[useBadgeTypes] Error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchBadgeTypes();
  }, []);

  return {
    badgeTypes,
    loading,
    error,
  };
}

// ============================================================================
// BADGE CONFIRMATION HOOKS
// ============================================================================

/**
 * Hook to confirm a badge
 */
export function useConfirmBadge() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const confirmBadge = useCallback(async (badgeId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/badges/${badgeId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to confirm badge');
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to confirm badge';
      setError(errorMessage);
      console.error('[useConfirmBadge] Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    confirmBadge,
    loading,
    error,
  };
}

/**
 * Hook to revoke a badge confirmation
 */
export function useRevokeBadge() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const revokeBadge = useCallback(async (badgeId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/badges/${badgeId}/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to revoke badge confirmation');
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to revoke badge confirmation';
      setError(errorMessage);
      console.error('[useRevokeBadge] Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    revokeBadge,
    loading,
    error,
  };
}

// ============================================================================
// COMBINED BADGE MANAGEMENT HOOK
// ============================================================================

/**
 * Combined hook for badge management
 * Provides badge data and actions (confirm/revoke) in one hook
 * 
 * @param entityId - The entity ID
 * @param entityType - The entity type
 * @param enabled - Whether to enable the query (default: true)
 * 
 * @example
 * ```tsx
 * const { badges, confirmBadge, revokeBadge, loading } = useBadgeManagement(
 *   providerId,
 *   'provider'
 * );
 * 
 * // Confirm a badge
 * await confirmBadge(badgeId);
 * 
 * // Revoke a badge
 * await revokeBadge(badgeId);
 * ```
 */
export function useBadgeManagement(
  entityId: string | null | undefined,
  entityType: EntityType,
  enabled: boolean = true
) {
  const { badges, loading: fetchLoading, error: fetchError, refetch } = useBadges(
    entityId,
    entityType,
    enabled
  );
  const { confirmBadge, loading: confirmLoading, error: confirmError } = useConfirmBadge();
  const { revokeBadge, loading: revokeLoading, error: revokeError } = useRevokeBadge();

  const handleConfirmBadge = useCallback(
    async (badgeId: string) => {
      await confirmBadge(badgeId);
      await refetch(); // Refetch badges to update UI
    },
    [confirmBadge, refetch]
  );

  const handleRevokeBadge = useCallback(
    async (badgeId: string) => {
      await revokeBadge(badgeId);
      await refetch(); // Refetch badges to update UI
    },
    [revokeBadge, refetch]
  );

  return {
    badges,
    confirmBadge: handleConfirmBadge,
    revokeBadge: handleRevokeBadge,
    loading: fetchLoading || confirmLoading || revokeLoading,
    error: fetchError || confirmError || revokeError,
    refetch,
  };
}

// ============================================================================
// ADMIN BADGE HOOKS
// ============================================================================

/**
 * Hook to verify a badge (admin only)
 */
export function useVerifyBadge() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const verifyBadge = useCallback(async (badgeId: string, reason?: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/badges/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ badgeId, reason }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to verify badge');
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify badge';
      setError(errorMessage);
      console.error('[useVerifyBadge] Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    verifyBadge,
    loading,
    error,
  };
}

/**
 * Hook to unverify a badge (admin only)
 */
export function useUnverifyBadge() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const unverifyBadge = useCallback(async (badgeId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/badges/unverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ badgeId }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to unverify badge');
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unverify badge';
      setError(errorMessage);
      console.error('[useUnverifyBadge] Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    unverifyBadge,
    loading,
    error,
  };
}

