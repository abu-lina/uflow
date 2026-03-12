/**
 * Tests for provider owner outreach service
 * Plan 038: Provider Owner Outreach & Claim System
 * 
 * TDD: These tests are written BEFORE implementation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockRpc = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

const mockFrom = vi.fn((_table: string) => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: (fn: string, params?: unknown) => mockRpc(fn, params),
  },
}));

function setupChain() {
  const chain = {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    eq: mockEq,
    single: mockSingle,
  };

  mockSelect.mockReturnValue(chain);
  mockInsert.mockReturnValue(chain);
  mockUpdate.mockReturnValue(chain);
  mockEq.mockReturnValue(chain);
  mockSingle.mockResolvedValue({ data: null, error: null });
}

// Import after mocks
import {
  validateOutreachToken,
  createOutreachToken,
  getOutreachByProvider,
  updateOutreachStatus,
  getPendingOutreach,
  type OutreachStatus,
  type OutreachToken,
  type ProviderOutreach,
} from '@/services/outreach';

describe('outreach service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupChain();
  });

  describe('validateOutreachToken', () => {
    it('returns valid result for unexpired, unconsumed token', async () => {
      const tokenHash = 'abc123hash';
      mockRpc.mockResolvedValueOnce({
        data: [{
          is_valid: true,
          provider_id: 'provider-uuid',
          provider_name: 'Test Provider',
          action_scope: 'decision',
          error_message: null,
        }],
        error: null,
      });

      const result = await validateOutreachToken(tokenHash);

      expect(mockRpc).toHaveBeenCalledWith('validate_outreach_token', {
        p_token_hash: tokenHash,
      });
      expect(result.isValid).toBe(true);
      expect(result.providerId).toBe('provider-uuid');
      expect(result.providerName).toBe('Test Provider');
      expect(result.actionScope).toBe('decision');
    });

    it('returns invalid result for expired token', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{
          is_valid: false,
          provider_id: null,
          provider_name: null,
          action_scope: null,
          error_message: 'Token expired',
        }],
        error: null,
      });

      const result = await validateOutreachToken('expired-token');

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Token expired');
    });

    it('returns invalid result for consumed token', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{
          is_valid: false,
          provider_id: null,
          provider_name: null,
          action_scope: null,
          error_message: 'Token already used',
        }],
        error: null,
      });

      const result = await validateOutreachToken('used-token');

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Token already used');
    });

    it('handles RPC error gracefully', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await validateOutreachToken('any-token');

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('error');
    });
  });

  describe('createOutreachToken', () => {
    it('creates a token with correct parameters', async () => {
      const params = {
        providerId: 'provider-uuid',
        outreachId: 'outreach-uuid',
        providerName: 'Test Provider',
        actionScope: 'decision' as const,
        expiresInDays: 7,
      };

      mockInsert.mockReturnValueOnce({
        select: mockSelect.mockReturnValueOnce({
          single: mockSingle.mockResolvedValueOnce({
            data: { id: 'token-uuid', token_hash: 'hashed-value' },
            error: null,
          }),
        }),
      });

      const result = await createOutreachToken(params);

      expect(mockFrom).toHaveBeenCalledWith('provider_owner_action_tokens');
      expect(result.tokenId).toBe('token-uuid');
      expect(result.rawToken).toBeDefined(); // Raw token for email
      expect(typeof result.rawToken).toBe('string');
    });

    it('throws error on insert failure', async () => {
      mockInsert.mockReturnValueOnce({
        select: mockSelect.mockReturnValueOnce({
          single: mockSingle.mockResolvedValueOnce({
            data: null,
            error: { message: 'Insert failed' },
          }),
        }),
      });

      await expect(createOutreachToken({
        providerId: 'provider-uuid',
        providerName: 'Test Provider',
        actionScope: 'decision',
      })).rejects.toThrow();
    });
  });

  describe('getOutreachByProvider', () => {
    it('returns outreach record for provider', async () => {
      const providerId = 'provider-uuid';
      const mockOutreach: ProviderOutreach = {
        id: 'outreach-uuid',
        providerId: 'provider-uuid',
        candidateEmail: 'owner@example.com',
        candidatePhone: null,
        candidateInstagram: null,
        selectedChannel: 'email',
        language: 'de',
        status: 'pending_approval',
        attemptCount: 0,
        createdAt: '2026-03-09T00:00:00Z',
      };

      mockSelect.mockReturnValueOnce({
        eq: mockEq.mockReturnValueOnce({
          single: mockSingle.mockResolvedValueOnce({
            data: {
              id: mockOutreach.id,
              provider_id: mockOutreach.providerId,
              candidate_email: mockOutreach.candidateEmail,
              candidate_phone: mockOutreach.candidatePhone,
              candidate_instagram: mockOutreach.candidateInstagram,
              selected_channel: mockOutreach.selectedChannel,
              language: mockOutreach.language,
              status: mockOutreach.status,
              attempt_count: mockOutreach.attemptCount,
              created_at: mockOutreach.createdAt,
            },
            error: null,
          }),
        }),
      });

      const result = await getOutreachByProvider(providerId);

      expect(mockFrom).toHaveBeenCalledWith('provider_owner_outreach');
      expect(result).toEqual(mockOutreach);
    });

    it('returns null when no outreach exists', async () => {
      mockSelect.mockReturnValueOnce({
        eq: mockEq.mockReturnValueOnce({
          single: mockSingle.mockResolvedValueOnce({
            data: null,
            error: null,
          }),
        }),
      });

      const result = await getOutreachByProvider('nonexistent-provider');

      expect(result).toBeNull();
    });
  });

  describe('updateOutreachStatus', () => {
    it('updates status successfully', async () => {
      const outreachId = 'outreach-uuid';
      const newStatus: OutreachStatus = 'claimed';

      mockUpdate.mockReturnValueOnce({
        eq: mockEq.mockReturnValueOnce({
          select: mockSelect.mockReturnValueOnce({
            single: mockSingle.mockResolvedValueOnce({
              data: { id: outreachId, status: newStatus },
              error: null,
            }),
          }),
        }),
      });

      const result = await updateOutreachStatus(outreachId, newStatus);

      expect(mockFrom).toHaveBeenCalledWith('provider_owner_outreach');
      expect(result.status).toBe(newStatus);
    });

    it('can set outcome note when updating status', async () => {
      mockUpdate.mockReturnValueOnce({
        eq: mockEq.mockReturnValueOnce({
          select: mockSelect.mockReturnValueOnce({
            single: mockSingle.mockResolvedValueOnce({
              data: { id: 'outreach-uuid', status: 'kept', outcome_note: 'Owner wants to stay' },
              error: null,
            }),
          }),
        }),
      });

      const result = await updateOutreachStatus('outreach-uuid', 'kept', 'Owner wants to stay');

      expect(result.outcomeNote).toBe('Owner wants to stay');
    });
  });

  describe('getPendingOutreach', () => {
    it('returns outreach records ready for dispatch', async () => {
      const mockPendingList = [
        {
          id: 'outreach-1',
          provider_id: 'provider-1',
          candidate_email: 'owner1@example.com',
          selected_channel: 'email',
          status: 'approved',
          dispatch_after: '2026-03-08T00:00:00Z',
        },
        {
          id: 'outreach-2',
          provider_id: 'provider-2',
          candidate_email: 'owner2@example.com',
          selected_channel: 'email',
          status: 'pending_dispatch',
          dispatch_after: '2026-03-07T00:00:00Z',
        },
      ];

      mockSelect.mockReturnValueOnce({
        in: vi.fn().mockReturnValueOnce({
          lte: vi.fn().mockReturnValueOnce({
            lt: vi.fn().mockReturnValueOnce({
              order: vi.fn().mockReturnValueOnce({
                limit: vi.fn().mockResolvedValueOnce({
                  data: mockPendingList,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await getPendingOutreach(10);

      expect(mockFrom).toHaveBeenCalledWith('provider_owner_outreach');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('outreach-1');
    });

    it('returns empty array when no pending outreach', async () => {
      mockSelect.mockReturnValueOnce({
        in: vi.fn().mockReturnValueOnce({
          lte: vi.fn().mockReturnValueOnce({
            lt: vi.fn().mockReturnValueOnce({
              order: vi.fn().mockReturnValueOnce({
                limit: vi.fn().mockResolvedValueOnce({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const result = await getPendingOutreach(10);

      expect(result).toEqual([]);
    });
  });
});

describe('outreach types', () => {
  it('exports OutreachStatus type with all valid values', () => {
    const validStatuses: OutreachStatus[] = [
      'pending_approval',
      'approved',
      'pending_dispatch',
      'dispatched',
      'failed',
      'claimed',
      'removed',
      'kept',
      'expired',
    ];
    
    // Type check passes if this compiles
    expect(validStatuses).toHaveLength(9);
  });

  it('exports OutreachToken type with required fields', () => {
    const token: OutreachToken = {
      id: 'token-id',
      tokenHash: 'hash',
      providerId: 'provider-id',
      actionScope: 'decision',
      expiresAt: '2026-03-16T00:00:00Z',
      consumedAt: null,
      providerNameSnapshot: 'Test Provider',
      createdAt: '2026-03-09T00:00:00Z',
    };

    expect(token.id).toBeDefined();
    expect(token.actionScope).toBe('decision');
  });
});
