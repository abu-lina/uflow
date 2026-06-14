import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  OpenRouterRequest,
  OpenRouterResponse,
  ChatMessage,
  ToolDefinition,
} from '@/features/chat/types';

// We test the formatting and error handling of sendChatRequest
// without actually calling the OpenRouter API

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}));
vi.stubGlobal('fetch', mockFetch);

import { sendChatRequest } from '@/lib/openrouter';

function makeMockResponse(body: OpenRouterResponse, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    headers: new Headers(),
  } as Response;
}

function makeMockErrorResponse(error: { error: { message: string; type: string; code?: number } }, status = 400): Response {
  return {
    ok: false,
    status,
    json: () => Promise.resolve(error),
    headers: new Headers(),
  } as Response;
}

describe('OpenRouter Client (sendChatRequest)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENROUTER_API_KEY = 'sk-or-test-key';
    process.env.OPENROUTER_MODEL = 'openai/gpt-4o-mini';
  });

  describe('request formatting', () => {
    it('constructs correct request shape with messages array', async () => {
      const successResponse: OpenRouterResponse = {
        id: 'chat-123',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Hallo! Wie kann ich helfen?' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      };

      mockFetch.mockResolvedValue(makeMockResponse(successResponse));

      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Finde Döner in Berlin' },
      ];

      const result = await sendChatRequest(messages);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');

      const body = JSON.parse(options.body);
      expect(body.model).toBe('openai/gpt-4o-mini');
      expect(body.messages).toEqual(messages);
      expect(options.headers['Authorization']).toBe('Bearer sk-or-test-key');
      expect(options.headers['Content-Type']).toBe('application/json');

      expect(result.message.content).toBe('Hallo! Wie kann ich helfen?');
      expect(result.usage?.total_tokens).toBe(150);
    });

    it('includes tool definitions when provided', async () => {
      const tools: ToolDefinition[] = [
        {
          type: 'function',
          function: {
            name: 'search_providers',
            description: 'Search for providers',
            parameters: {
              type: 'object',
              properties: { query: { type: 'string' } },
              required: ['query'],
            },
          },
        },
      ];

      mockFetch.mockResolvedValue(
        makeMockResponse({
          id: 'chat-456',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: null, tool_calls: [] },
              finish_reason: 'tool_calls',
            },
          ],
        }),
      );

      await sendChatRequest([{ role: 'user', content: 'test' }], { tools });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.tools).toEqual(tools);
      expect(body.tool_choice).toBe('auto');
    });

    it('uses default model when OPENROUTER_MODEL is not set', async () => {
      delete (process.env as Record<string, string>).OPENROUTER_MODEL;

      mockFetch.mockResolvedValue(
        makeMockResponse({
          id: 'chat-789',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Ok' },
              finish_reason: 'stop',
            },
          ],
        }),
      );

      await sendChatRequest([{ role: 'user', content: 'test' }]);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.model).toBe('openai/gpt-4o-mini');
    });
  });

  describe('error handling', () => {
    it('throws on 401 invalid API key', async () => {
      mockFetch.mockResolvedValue(
        makeMockErrorResponse(
          { error: { message: 'Invalid API key', type: 'auth_error', code: 401 } },
          401,
        ),
      );

      await expect(
        sendChatRequest([{ role: 'user', content: 'test' }]),
      ).rejects.toThrow('OpenRouter API error: 401');
    });

    it('throws on 429 rate limit', async () => {
      mockFetch.mockResolvedValue(
        makeMockErrorResponse(
          { error: { message: 'Rate limit exceeded', type: 'rate_limit', code: 429 } },
          429,
        ),
      );

      await expect(
        sendChatRequest([{ role: 'user', content: 'test' }]),
      ).rejects.toThrow('OpenRouter API error: 429');
    });

    it('throws on 5xx server error', async () => {
      mockFetch.mockResolvedValue(
        makeMockErrorResponse(
          { error: { message: 'Internal server error', type: 'server_error', code: 500 } },
          500,
        ),
      );

      await expect(
        sendChatRequest([{ role: 'user', content: 'test' }]),
      ).rejects.toThrow('OpenRouter API error: 500');
    });

    it('throws when OPENROUTER_API_KEY is missing', async () => {
      delete (process.env as Record<string, string>).OPENROUTER_API_KEY;

      await expect(
        sendChatRequest([{ role: 'user', content: 'test' }]),
      ).rejects.toThrow('OPENROUTER_API_KEY is not configured');
    });
  });

  describe('response parsing', () => {
    it('extracts content from assistant message', async () => {
      mockFetch.mockResolvedValue(
        makeMockResponse({
          id: 'chat-abc',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Here are some results.' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
        }),
      );

      const result = await sendChatRequest([{ role: 'user', content: 'test' }]);
      expect(result.message.content).toBe('Here are some results.');
      expect(result.message.role).toBe('assistant');
    });

    it('extracts tool calls from response', async () => {
      const toolCalls = [
        {
          id: 'call_1',
          type: 'function' as const,
          function: { name: 'search_providers', arguments: '{"query":"Döner"}' },
        },
      ];

      mockFetch.mockResolvedValue(
        makeMockResponse({
          id: 'chat-tool',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: null, tool_calls: toolCalls },
              finish_reason: 'tool_calls',
            },
          ],
          usage: { prompt_tokens: 80, completion_tokens: 30, total_tokens: 110 },
        }),
      );

      const result = await sendChatRequest([{ role: 'user', content: 'Finde Döner' }]);
      expect(result.message.tool_calls).toEqual(toolCalls);
      expect(result.message.content).toBeNull();
    });
  });
});
