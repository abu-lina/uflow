import type { ChatMessage, ToolCall } from '@/features/chat/types';

export interface RedirectCounter {
  count: number;
}

export interface GuardrailResult {
  status: 'ok' | 'redirect' | 'block';
  redirectCount: number;
}

const MAX_CONSECUTIVE_REDIRECTS = 2;

export function createRedirectCounter(): RedirectCounter {
  return { count: 0 };
}

/**
 * Function-calling gate guardrail (Tier 1 + Tier 2).
 *
 * Deterministic, language-agnostic approach:
 * - If the LLM response contains tool_calls → it's an in-scope query (Tier 1 OK)
 * - If the LLM response is text-only (no tool_calls) → potential redirect (Tier 1)
 * - If 2+ consecutive text-only responses in a session → Tier 2 hard block
 *
 * Tool call check resets the redirect counter:
 * - A successful tool-based interaction clears any previous redirects
 */
export function checkGuardrail(
  message: { role: string; content: string | null; tool_calls?: ToolCall[] },
  counter: RedirectCounter,
): GuardrailResult {
  const hasToolCalls = !!(message.tool_calls && message.tool_calls.length > 0);

  if (hasToolCalls) {
    counter.count = 0;
    return { status: 'ok', redirectCount: counter.count };
  }

  counter.count++;

  if (counter.count >= MAX_CONSECUTIVE_REDIRECTS) {
    return { status: 'block', redirectCount: counter.count };
  }

  return { status: 'redirect', redirectCount: counter.count };
}
