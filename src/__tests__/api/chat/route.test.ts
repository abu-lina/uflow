import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

// Mocks for dependencies
const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
}));
vi.mock('@/lib/supabase/getUserFromCookie', () => ({
  getUserFromCookie: mockGetUser,
}));

const { mockRateCheck } = vi.hoisted(() => ({
  mockRateCheck: vi.fn(),
}));
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mockRateCheck,
  getClientIdentifier: vi.fn((_req: Request, userId?: string) =>
    userId ? `user:${userId}` : 'ip:127.0.0.1',
  ),
}));

const { mockSendChat } = vi.hoisted(() => ({
  mockSendChat: vi.fn(),
}));
vi.mock('@/lib/openrouter', () => ({
  sendChatRequest: mockSendChat,
}));

const { mockExecuteTool } = vi.hoisted(() => ({
  mockExecuteTool: vi.fn(),
}));
vi.mock('@/features/chat/services/tool-executor', () => ({
  executeToolCall: mockExecuteTool,
  TOOL_DEFINITIONS: [],
}));

const { mockCheckGuardrail } = vi.hoisted(() => ({
  mockCheckGuardrail: vi.fn(),
}));
const { mockCreateCounter } = vi.hoisted(() => ({
  mockCreateCounter: vi.fn(() => ({ count: 0 })),
}));
vi.mock('@/features/chat/services/guardrails', () => ({
  checkGuardrail: mockCheckGuardrail,
  createRedirectCounter: mockCreateCounter,
}));

// Supabase server client mock
const mockSupabaseServer = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
};
vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(() => mockSupabaseServer),
}));

import { POST } from '@/app/api/chat/route';
import { MAX_MESSAGE_LENGTH } from '@/features/chat/types';

function createRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ id: 'user-123', email: 'test@test.com' });
    mockRateCheck.mockReturnValue(true);
    mockCheckGuardrail.mockReturnValue({ status: 'ok', redirectCount: 0 });
  });

  describe('authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      mockGetUser.mockResolvedValue(null);

      const response = await POST(createRequest({ message: 'test' }));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Authentication required');
    });
  });

  describe('request validation', () => {
    it('returns 400 when message is missing', async () => {
      const response = await POST(createRequest({}));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Message is required');
    });

    it('returns 400 when message is empty string', async () => {
      const response = await POST(createRequest({ message: '   ' }));
      const data = await response.json();

      expect(response.status).toBe(400);
    });

    it('returns 400 when message exceeds max length', async () => {
      const longMessage = 'a'.repeat(MAX_MESSAGE_LENGTH + 1);
      const response = await POST(createRequest({ message: longMessage }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('exceeds maximum length');
    });
  });

  describe('rate limiting', () => {
    it('returns 429 when rate limit exceeded', async () => {
      mockRateCheck.mockReturnValue(false);

      const response = await POST(createRequest({ message: 'test' }));
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Rate limit');
    });
  });

  describe('successful chat flow', () => {
    beforeEach(() => {
      mockSupabaseServer.maybeSingle.mockResolvedValue({ data: null, error: null });
      mockSupabaseServer.single.mockResolvedValue({
        data: { id: 'conv-1', user_id: 'user-123', title: 'Hello', created_at: '2026-01-01', updated_at: '2026-01-01' },
        error: null,
      });
      mockSupabaseServer.limit.mockReturnValue({ data: [], error: null });
      mockSupabaseServer.order.mockReturnThis();

      mockSendChat.mockResolvedValue({
        id: 'resp-1',
        message: { role: 'assistant', content: 'Hallo! Wie kann ich helfen?' },
        usage: { total_tokens: 100 },
      });
    });

    it('returns chat response with conversation_id', async () => {
      const response = await POST(createRequest({ message: 'Hallo' }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.conversation_id).toBeDefined();
      expect(data.message.content).toBe('Hallo! Wie kann ich helfen?');
      expect(data.message.role).toBe('assistant');
    });

    it('creates a new conversation when conversation_id is not provided', async () => {
      await POST(createRequest({ message: 'Hallo' }));

      expect(mockSupabaseServer.from).toHaveBeenCalledWith('conversations');
    });

    it('passes user language context to LLM', async () => {
      await POST(createRequest({ message: 'Finde Döner' }));

      const messages = mockSendChat.mock.calls[0][0];
      const systemMessage = messages.find((m: { role: string }) => m.role === 'system');
      expect(systemMessage).toBeDefined();
      expect(systemMessage.content).toContain('Ummah Flow Assistant');
    });
  });

  describe('guardrail blocking', () => {
    it('returns block message when guardrail triggers Tier 2', async () => {
      mockSupabaseServer.maybeSingle.mockResolvedValue({ data: null, error: null });
      mockSupabaseServer.single.mockResolvedValue({
        data: { id: 'conv-block', user_id: 'user-123', title: 'Test', created_at: '2026-01-01', updated_at: '2026-01-01' },
        error: null,
      });
      mockSupabaseServer.limit.mockReturnValue({ data: [], error: null });

      mockSendChat.mockResolvedValue({
        id: 'resp-2',
        message: { role: 'assistant', content: 'Das kann ich nicht beantworten.' },
        usage: { total_tokens: 50 },
      });

      mockCheckGuardrail.mockReturnValue({ status: 'block', redirectCount: 2 });

      const response = await POST(createRequest({ message: 'Was ist das Wetter?' }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.guardrail).toBe('block');
    });
  });
});
