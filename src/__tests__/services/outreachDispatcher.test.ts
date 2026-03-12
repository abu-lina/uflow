/**
 * Tests for provider owner outreach dispatcher
 * Plan 038: Provider Owner Outreach & Claim System
 * 
 * TDD: These tests are written BEFORE implementation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock outreach service
vi.mock('@/services/outreach', () => ({
  getPendingOutreach: vi.fn(),
  createOutreachToken: vi.fn(),
  recordDispatchAttempt: vi.fn(),
  createOutreachTask: vi.fn(),
  getOutreachById: vi.fn(),
  hashToken: vi.fn((t) => `hashed-${t}`),
}));

// Mock email service
vi.mock('@/services/email/outreachEmail', () => ({
  sendProviderOutreachEmail: vi.fn(),
}));

import {
  processOutreachQueue,
  dispatchSingleOutreach,
  buildOutreachTokenUrl,
  type DispatchResult,
} from '@/services/outreachDispatcher';

import {
  getPendingOutreach,
  createOutreachToken,
  recordDispatchAttempt,
  createOutreachTask,
} from '@/services/outreach';

import { sendProviderOutreachEmail } from '@/services/email/outreachEmail';

describe('outreachDispatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processOutreachQueue', () => {
    it('processes all pending outreach records', async () => {
      const mockPending = [
        {
          id: 'outreach-1',
          providerId: 'provider-1',
          candidateEmail: 'owner1@example.com',
          selectedChannel: 'email',
          language: 'de',
          status: 'approved',
          attemptCount: 0,
        },
        {
          id: 'outreach-2',
          providerId: 'provider-2',
          candidateEmail: 'owner2@example.com',
          selectedChannel: 'email',
          language: 'de',
          status: 'approved',
          attemptCount: 0,
        },
      ];

      vi.mocked(getPendingOutreach).mockResolvedValueOnce(mockPending as never);
      vi.mocked(createOutreachToken).mockResolvedValue({
        tokenId: 'token-id',
        rawToken: 'raw-token',
      });
      vi.mocked(sendProviderOutreachEmail).mockResolvedValue({ success: true });
      vi.mocked(recordDispatchAttempt).mockResolvedValue({} as never);

      const results = await processOutreachQueue(10);

      expect(getPendingOutreach).toHaveBeenCalledWith(10);
      expect(results).toHaveLength(2);
      expect(results[0].outreachId).toBe('outreach-1');
      expect(results[1].outreachId).toBe('outreach-2');
    });

    it('returns empty array when no pending outreach', async () => {
      vi.mocked(getPendingOutreach).mockResolvedValueOnce([]);

      const results = await processOutreachQueue(10);

      expect(results).toEqual([]);
    });

    it('continues processing if one dispatch fails', async () => {
      const mockPending = [
        {
          id: 'outreach-1',
          providerId: 'provider-1',
          candidateEmail: 'invalid-email',
          selectedChannel: 'email',
          language: 'de',
          status: 'approved',
          attemptCount: 0,
        },
        {
          id: 'outreach-2',
          providerId: 'provider-2',
          candidateEmail: 'owner2@example.com',
          selectedChannel: 'email',
          language: 'de',
          status: 'approved',
          attemptCount: 0,
        },
      ];

      vi.mocked(getPendingOutreach).mockResolvedValueOnce(mockPending as never);
      vi.mocked(createOutreachToken).mockResolvedValue({
        tokenId: 'token-id',
        rawToken: 'raw-token',
      });
      // First fails, second succeeds
      vi.mocked(sendProviderOutreachEmail)
        .mockResolvedValueOnce({ success: false, error: 'Invalid email' })
        .mockResolvedValueOnce({ success: true });
      vi.mocked(recordDispatchAttempt).mockResolvedValue({} as never);

      const results = await processOutreachQueue(10);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);
    });
  });

  describe('dispatchSingleOutreach', () => {
    it('dispatches email successfully', async () => {
      const outreach = {
        id: 'outreach-1',
        providerId: 'provider-1',
        candidateEmail: 'owner@example.com',
        candidatePhone: null,
        candidateInstagram: null,
        selectedChannel: 'email' as const,
        language: 'de',
        status: 'approved' as const,
        attemptCount: 0,
        createdAt: '2026-03-09T00:00:00Z',
      };

      vi.mocked(createOutreachToken).mockResolvedValueOnce({
        tokenId: 'token-id',
        rawToken: 'raw-token-abc',
      });
      vi.mocked(sendProviderOutreachEmail).mockResolvedValueOnce({ success: true });
      vi.mocked(recordDispatchAttempt).mockResolvedValueOnce({
        ...outreach,
        status: 'dispatched',
        attemptCount: 1,
      });

      const result = await dispatchSingleOutreach(outreach);

      expect(result.success).toBe(true);
      expect(result.outreachId).toBe('outreach-1');
      expect(createOutreachToken).toHaveBeenCalledWith({
        providerId: 'provider-1',
        outreachId: 'outreach-1',
        providerName: expect.any(String),
        actionScope: 'decision',
      });
      expect(sendProviderOutreachEmail).toHaveBeenCalled();
      expect(recordDispatchAttempt).toHaveBeenCalledWith('outreach-1', true);
    });

    it('creates manual task for phone channel', async () => {
      const outreach = {
        id: 'outreach-2',
        providerId: 'provider-2',
        candidateEmail: null,
        candidatePhone: '+49123456789',
        candidateInstagram: null,
        selectedChannel: 'phone' as const,
        language: 'de',
        status: 'approved' as const,
        attemptCount: 0,
        createdAt: '2026-03-09T00:00:00Z',
      };

      vi.mocked(createOutreachTask).mockResolvedValueOnce({
        id: 'task-1',
        providerId: 'provider-2',
        outreachId: 'outreach-2',
        channel: 'phone',
        contactValue: '+49123456789',
        taskStatus: 'pending',
        completedAt: null,
        completedBy: null,
        outcomeNote: null,
        createdAt: '2026-03-09T00:00:00Z',
      });
      vi.mocked(recordDispatchAttempt).mockResolvedValueOnce({
        ...outreach,
        status: 'dispatched',
        attemptCount: 1,
      });

      const result = await dispatchSingleOutreach(outreach);

      expect(result.success).toBe(true);
      expect(createOutreachTask).toHaveBeenCalledWith({
        providerId: 'provider-2',
        outreachId: 'outreach-2',
        channel: 'phone',
        contactValue: '+49123456789',
      });
      // Email should NOT have been called
      expect(sendProviderOutreachEmail).not.toHaveBeenCalled();
    });

    it('creates manual task for Instagram channel', async () => {
      const outreach = {
        id: 'outreach-3',
        providerId: 'provider-3',
        candidateEmail: null,
        candidatePhone: null,
        candidateInstagram: '@provider_handle',
        selectedChannel: 'instagram' as const,
        language: 'de',
        status: 'approved' as const,
        attemptCount: 0,
        createdAt: '2026-03-09T00:00:00Z',
      };

      vi.mocked(createOutreachTask).mockResolvedValueOnce({
        id: 'task-2',
        providerId: 'provider-3',
        outreachId: 'outreach-3',
        channel: 'instagram',
        contactValue: '@provider_handle',
        taskStatus: 'pending',
        completedAt: null,
        completedBy: null,
        outcomeNote: null,
        createdAt: '2026-03-09T00:00:00Z',
      });
      vi.mocked(recordDispatchAttempt).mockResolvedValueOnce({
        ...outreach,
        status: 'dispatched',
        attemptCount: 1,
      });

      const result = await dispatchSingleOutreach(outreach);

      expect(result.success).toBe(true);
      expect(createOutreachTask).toHaveBeenCalledWith({
        providerId: 'provider-3',
        outreachId: 'outreach-3',
        channel: 'instagram',
        contactValue: '@provider_handle',
      });
    });

    it('handles email send failure', async () => {
      const outreach = {
        id: 'outreach-4',
        providerId: 'provider-4',
        candidateEmail: 'invalid@example',
        candidatePhone: null,
        candidateInstagram: null,
        selectedChannel: 'email' as const,
        language: 'de',
        status: 'approved' as const,
        attemptCount: 0,
        createdAt: '2026-03-09T00:00:00Z',
      };

      vi.mocked(createOutreachToken).mockResolvedValueOnce({
        tokenId: 'token-id',
        rawToken: 'raw-token',
      });
      vi.mocked(sendProviderOutreachEmail).mockResolvedValueOnce({
        success: false,
        error: 'Email delivery failed',
      });
      vi.mocked(recordDispatchAttempt).mockResolvedValueOnce({
        ...outreach,
        status: 'pending_dispatch',
        attemptCount: 1,
        dispatchError: 'Email delivery failed',
      });

      const result = await dispatchSingleOutreach(outreach);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email delivery failed');
      expect(recordDispatchAttempt).toHaveBeenCalledWith(
        'outreach-4',
        false,
        'Email delivery failed'
      );
    });

    it('skips dispatch if no valid contact for channel', async () => {
      const outreach = {
        id: 'outreach-5',
        providerId: 'provider-5',
        candidateEmail: null,
        candidatePhone: null,
        candidateInstagram: null,
        selectedChannel: 'email' as const,
        language: 'de',
        status: 'approved' as const,
        attemptCount: 0,
        createdAt: '2026-03-09T00:00:00Z',
      };

      vi.mocked(recordDispatchAttempt).mockResolvedValueOnce({
        ...outreach,
        status: 'failed',
        attemptCount: 1,
      });

      const result = await dispatchSingleOutreach(outreach);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid contact');
    });
  });

  describe('buildOutreachTokenUrl', () => {
    it('builds correct URL with token', () => {
      const baseUrl = 'https://ummahflow.com';
      const rawToken = 'abc123token';

      const url = buildOutreachTokenUrl(baseUrl, rawToken);

      expect(url).toBe('https://ummahflow.com/owner-decision?token=abc123token');
    });

    it('handles base URL with trailing slash', () => {
      const url = buildOutreachTokenUrl('https://ummahflow.com/', 'token123');

      expect(url).toBe('https://ummahflow.com/owner-decision?token=token123');
    });
  });
});

describe('DispatchResult type', () => {
  it('has required fields for success', () => {
    const result: DispatchResult = {
      outreachId: 'outreach-1',
      success: true,
      channel: 'email',
    };

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('has required fields for failure', () => {
    const result: DispatchResult = {
      outreachId: 'outreach-1',
      success: false,
      channel: 'email',
      error: 'Send failed',
    };

    expect(result.success).toBe(false);
    expect(result.error).toBe('Send failed');
  });
});
