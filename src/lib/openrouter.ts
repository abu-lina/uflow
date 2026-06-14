import type {
  ChatMessage,
  OpenRouterRequest,
  OpenRouterResponse,
  ToolDefinition,
} from '@/features/chat/types';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export interface ChatCompletionResult {
  id: string;
  message: {
    role: string;
    content: string | null;
    tool_calls?: OpenRouterResponse['choices'][0]['message']['tool_calls'];
  };
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface SendChatRequestOptions {
  tools?: ToolDefinition[];
  tool_choice?: 'auto' | 'none';
  max_tokens?: number;
  temperature?: number;
}

export async function sendChatRequest(
  messages: ChatMessage[],
  options?: SendChatRequestOptions,
): Promise<ChatCompletionResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

  const body: OpenRouterRequest = {
    model,
    messages,
    max_tokens: options?.max_tokens ?? 1024,
    temperature: options?.temperature ?? 0.7,
  };

  if (options?.tools && options.tools.length > 0) {
    body.tools = options.tools;
    body.tool_choice = options.tool_choice ?? 'auto';
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://ummahflow.com',
      'X-Title': 'UFlow Chatbot',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data: OpenRouterResponse = await response.json();

  if (!data.choices || data.choices.length === 0) {
    throw new Error('OpenRouter returned empty response');
  }

  return {
    id: data.id,
    message: data.choices[0].message,
    usage: data.usage,
  };
}
