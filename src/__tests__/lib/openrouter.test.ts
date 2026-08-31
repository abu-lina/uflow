import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  OpenRouterRequest,
  OpenRouterResponse,
  ChatMessage,
  ToolDefinition,
} from '@/features/chat/types';

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
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: new Headers(),
  } as Response;
}

describe('sendChatRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear both providers
    delete (process.env as Record<string, string>).MISTRAL_API_KEY;
    delete (process.env as Record<string, string>).OPENROUTER_API_KEY;
    delete (process.env as Record<string, string>).MISTRAL_MODEL;
    delete (process.env as Record<string, string>).OPENROUTER_MODEL;
  });

  describe('Mistral AI (primary)', () => {
    beforeEach(() => {
      process.env.MISTRAL_API_KEY = 'mistral-test-key';
    });

    it('uses Mistral base URL and model', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({
        id: 'chat-1',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Hi' }, finish_reason: 'stop' }],
      }));

      await sendChatRequest([{ role: 'user', content: 'test' }]);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.mistral.ai/v1/chat/completions');
      expect(options.headers['Authorization']).toBe('Bearer mistral-test-key');

      const body = JSON.parse(options.body);
      expect(body.model).toBe('mistral-small-latest');
    });

    it('uses custom MISTRAL_MODEL when set', async () => {
      process.env.MISTRAL_MODEL = 'mistral-large-latest';
      mockFetch.mockResolvedValue(makeMockResponse({
        id: 'chat-2',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Hi' }, finish_reason: 'stop' }],
      }));

      await sendChatRequest([{ role: 'user', content: 'test' }]);
      expect(JSON.parse(mockFetch.mock.calls[0][1].body).model).toBe('mistral-large-latest');
    });

    it('includes tool definitions', async () => {
      const tools: ToolDefinition[] = [{
        type: 'function',
        function: { name: 'search', description: 'Search', parameters: { type: 'object', properties: {} } },
      }];

      mockFetch.mockResolvedValue(makeMockResponse({
        id: 'chat-3',
        choices: [{ index: 0, message: { role: 'assistant', content: null, tool_calls: [] }, finish_reason: 'tool_calls' }],
      }));

      await sendChatRequest([{ role: 'user', content: 'test' }], { tools });
      expect(JSON.parse(mockFetch.mock.calls[0][1].body).tools).toEqual(tools);
    });

    it('throws on API error with status code', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('{"error":"Unauthorized"}'),
      } as Response);

      await expect(
        sendChatRequest([{ role: 'user', content: 'test' }]),
      ).rejects.toThrow('Mistral AI API error 401');
    });
  });

  describe('OpenRouter (fallback)', () => {
    beforeEach(() => {
      process.env.OPENROUTER_API_KEY = 'or-test-key';
      process.env.OPENROUTER_MODEL = 'meta-llama/llama-3.3-70b-instruct';
    });

    it('uses OpenRouter when Mistral key is missing', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({
        id: 'chat-4',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Hi' }, finish_reason: 'stop' }],
      }));

      await sendChatRequest([{ role: 'user', content: 'test' }]);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
      expect(JSON.parse(mockFetch.mock.calls[0][1].body).model).toBe('meta-llama/llama-3.3-70b-instruct');
    });
  });

  describe('no provider configured', () => {
    it('throws when no API key is set', async () => {
      await expect(
        sendChatRequest([{ role: 'user', content: 'test' }]),
      ).rejects.toThrow('No AI provider configured');
    });
  });

  describe('response parsing', () => {
    beforeEach(() => {
      process.env.MISTRAL_API_KEY = 'key';
    });

    it('extracts content from assistant message', async () => {
      mockFetch.mockResolvedValue(makeMockResponse({
        id: 'chat-5',
        choices: [{ index: 0, message: { role: 'assistant', content: 'Here are results.' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
      }));

      const result = await sendChatRequest([{ role: 'user', content: 'test' }]);
      expect(result.message.content).toBe('Here are results.');
    });

    it('extracts tool calls from response', async () => {
      const toolCalls = [{
        id: 'call_1',
        type: 'function' as const,
        function: { name: 'search_providers', arguments: '{"query":"Döner"}' },
      }];

      mockFetch.mockResolvedValue(makeMockResponse({
        id: 'chat-6',
        choices: [{ index: 0, message: { role: 'assistant', content: null, tool_calls: toolCalls }, finish_reason: 'tool_calls' }],
      }));

      const result = await sendChatRequest([{ role: 'user', content: 'Find Döner' }]);
      expect(result.message.tool_calls).toEqual(toolCalls);
    });
  });
});
