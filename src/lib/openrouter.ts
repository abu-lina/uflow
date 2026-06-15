import type {
  ChatMessage,
  OpenRouterRequest,
  OpenRouterResponse,
  ToolDefinition,
} from '@/features/chat/types';

// Primary: Mistral AI (EU-hosted, GDPR compliant)
// Fallback: OpenRouter (US-hosted, multi-provider)
const MISTRAL_BASE_URL = 'https://api.mistral.ai/v1';
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
  timeout?: number;
}

function getLLMConfig() {
  const mistralKey = process.env.MISTRAL_API_KEY;
  if (mistralKey) {
    return {
      apiKey: mistralKey,
      baseUrl: MISTRAL_BASE_URL,
      model: process.env.MISTRAL_MODEL || 'mistral-small-latest',
      provider: 'Mistral AI',
    };
  }

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    return {
      apiKey: openRouterKey,
      baseUrl: OPENROUTER_BASE_URL,
      model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct',
      provider: 'OpenRouter',
    };
  }

  throw new Error('No AI provider configured. Set MISTRAL_API_KEY or OPENROUTER_API_KEY.');
}

export async function sendChatRequest(
  messages: ChatMessage[],
  options?: SendChatRequestOptions,
): Promise<ChatCompletionResult> {
  const config = getLLMConfig();

  // Sanitize messages for strict API validation (Mistral rejects extra fields)
  const sanitizedMessages = messages.map((msg) => {
    const clean: Record<string, unknown> = { role: msg.role, content: msg.content };
    if (msg.tool_call_id) clean.tool_call_id = msg.tool_call_id;
    // Only assistant messages may have tool_calls
    if (msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) {
      clean.tool_calls = msg.tool_calls;
    }
    return clean;
  });

  const body: OpenRouterRequest = {
    model: config.model,
    messages: sanitizedMessages as unknown as ChatMessage[],
    max_tokens: options?.max_tokens ?? 768,
    temperature: options?.temperature ?? 0.7,
  };

  if (options?.tools && options.tools.length > 0) {
    body.tools = options.tools;
    body.tool_choice = options.tool_choice ?? 'auto';
  }

  let lastError: Error | null = null;
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeout ?? 30000);
    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

      if (response.status === 429 && attempt < maxRetries) {
        // Rate limited — use Retry-After header or exponential backoff
        const retryAfter = response.headers.get('retry-after');
        const delay = retryAfter 
          ? parseInt(retryAfter, 10) * 1000 
          : Math.pow(2, attempt + 1) * 1000;  // 2s, 4s, 8s
        console.log(`[Mistral] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        lastError = new Error(`${config.provider} rate limited, retrying...`);
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`${config.provider} API error ${response.status}: ${errorBody.slice(0, 200)}`);
      }

      const data: OpenRouterResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error(`${config.provider} returned empty response`);
      }

      return {
        id: data.id,
        message: data.choices[0].message,
        usage: data.usage,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new Error(`${config.provider} request failed after ${maxRetries + 1} attempts`);
}
