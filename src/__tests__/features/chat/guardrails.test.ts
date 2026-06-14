import { describe, it, expect } from 'vitest';
import {
  checkGuardrail,
  createRedirectCounter,
  type RedirectCounter,
  type GuardrailResult,
} from '@/features/chat/services/guardrails';

describe('Guardrails — Function-Calling Gate', () => {
  describe('checkGuardrail', () => {
    it('returns ok when tool calls are present (in-scope query)', () => {
      const counter = createRedirectCounter();
      const result = checkGuardrail(
        { role: 'assistant', content: null, tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'search_providers', arguments: '{}' } }] },
        counter,
      );
      expect(result.status).toBe('ok');
    });

    it('returns ok when content is present with tool calls', () => {
      const counter = createRedirectCounter();
      const result = checkGuardrail(
        {
          role: 'assistant',
          content: 'Let me search for that',
          tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'search_providers', arguments: '{}' } }],
        },
        counter,
      );
      expect(result.status).toBe('ok');
    });

    it('returns redirect on text-only response (no tool call)', () => {
      const counter = createRedirectCounter();
      const result = checkGuardrail(
        { role: 'assistant', content: 'Ich kann dir nur bei der Suche nach Restaurants helfen.' },
        counter,
      );
      expect(result.status).toBe('redirect');
      expect(result.redirectCount).toBe(1);
    });

    it('returns redirect on null content with no tool calls', () => {
      const counter = createRedirectCounter();
      const result = checkGuardrail(
        { role: 'assistant', content: null },
        counter,
      );
      expect(result.status).toBe('redirect');
    });

    it('returns block after 2 consecutive redirects (Tier 2 escalation)', () => {
      const counter = createRedirectCounter();

      // First redirect
      checkGuardrail(
        { role: 'assistant', content: 'Ich kann nur bei UFlow-Diensten helfen.' },
        counter,
      );

      // Second consecutive redirect → block
      const result = checkGuardrail(
        { role: 'assistant', content: 'Das liegt außerhalb meines Bereichs.' },
        counter,
      );

      expect(result.status).toBe('block');
      expect(result.redirectCount).toBe(2);
    });

    it('resets redirect counter after successful tool call', () => {
      const counter = createRedirectCounter();

      // First redirect
      checkGuardrail(
        { role: 'assistant', content: 'Bitte frag nach UFlow-Diensten.' },
        counter,
      );

      // Then successful tool call (resets counter)
      checkGuardrail(
        {
          role: 'assistant',
          content: 'Ich suche für dich',
          tool_calls: [{ id: 'call_2', type: 'function', function: { name: 'search_providers', arguments: '{}' } }],
        },
        counter,
      );

      // Another redirect (counter should be 1, not 2)
      const result = checkGuardrail(
        { role: 'assistant', content: 'Bitte frag nach UFlow-Diensten.' },
        counter,
      );
      expect(result.status).toBe('redirect');
      expect(result.redirectCount).toBe(1);
    });
  });

  describe('createRedirectCounter', () => {
    it('creates a counter with initial value 0', () => {
      const counter = createRedirectCounter();
      expect(counter.count).toBe(0);
    });

    it('increments correctly', () => {
      const counter = createRedirectCounter();
      counter.count++;
      expect(counter.count).toBe(1);
    });
  });
});
