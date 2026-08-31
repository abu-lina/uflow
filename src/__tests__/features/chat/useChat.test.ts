import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}));
vi.stubGlobal('fetch', mockFetch);

import { useChat } from '@/features/chat/hooks/useChat';

describe('useChat', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () =>
        Promise.resolve({
          conversation_id: 'conv-1',
          message: { role: 'assistant', content: 'Hallo! Wie kann ich helfen?' },
        }),
    });
  });

  it('initializes with empty messages and not loading', () => {
    const { result } = renderHook(() => useChat());

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('adds user message and sends to API', async () => {
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hallo');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[0].content).toBe('Hallo');
    expect(result.current.messages[1].role).toBe('assistant');
  });

  it('sets conversation_id after first message', async () => {
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hallo');
    });

    expect(result.current.conversationId).toBe('conv-1');
  });

  it('sets loading state while waiting for response', async () => {
    let resolvePromise: (value: unknown) => void;
    mockFetch.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    const { result } = renderHook(() => useChat());

    let sendPromise: Promise<void>;
    await act(async () => {
      sendPromise = result.current.sendMessage('Test');
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePromise!({
        ok: true,
        json: () =>
          Promise.resolve({
            conversation_id: 'conv-1',
            message: { role: 'assistant', content: 'Response' },
          }),
      });
      await sendPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Test');
    });

    expect(result.current.error).toBeTruthy();
  });

  it('clears error when sending a new message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Test');
    });

    expect(result.current.error).toBeTruthy();

    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () =>
        Promise.resolve({
          conversation_id: 'conv-1',
          message: { role: 'assistant', content: 'OK' },
        }),
    });

    await act(async () => {
      await result.current.sendMessage('Retry');
    });

    expect(result.current.error).toBeNull();
  });

  it('[G1] captures results from API response and attaches to assistant message', async () => {
    const mockResults = [
      {
        provider_id: 'p1',
        provider_name: 'Döner Haus',
        address_city: 'Berlin',
        category_name: 'Türkisch',
        listing_type: 'food',
        muslim_owned: true,
        has_prayer_space: false,
        family_friendly: true,
        women_friendly: false,
      },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () =>
        Promise.resolve({
          conversation_id: 'conv-1',
          message: { role: 'assistant', content: 'Ich habe folgende Restaurants gefunden:' },
          results: mockResults,
        }),
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Finde Döner in Berlin');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[1].role).toBe('assistant');
    expect(result.current.messages[1].content).toBe('Ich habe folgende Restaurants gefunden:');
    expect(result.current.messages[1].results).toEqual(mockResults);
  });

  it('[G1] handles API response without results gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () =>
        Promise.resolve({
          conversation_id: 'conv-1',
          message: { role: 'assistant', content: 'Hallo!' },
        }),
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hallo');
    });

    expect(result.current.messages[1].results).toBeUndefined();
  });
});

describe('useChat session persistence (Plan 198 — M3)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () =>
        Promise.resolve({
          conversation_id: 'conv-1',
          message: { role: 'assistant', content: 'Hallo! Wie kann ich helfen?' },
        }),
    });
  });

  it('[pre-fix FAILS] restores messages from sessionStorage on remount', () => {
    const storedMessages = [
      { role: 'user', content: 'Empfiehl mir etwas' },
      { role: 'assistant', content: 'Hier sind Empfehlungen' },
    ];
    sessionStorage.setItem(
      'uflow_chat',
      JSON.stringify({ messages: storedMessages, conversationId: 'conv-restored' }),
    );

    const { result } = renderHook(() => useChat());

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.conversationId).toBe('conv-restored');
  });

  it('[post-fix PASSES] saves conversationId and messages to sessionStorage after API response', async () => {
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('Hallo');
    });

    const stored = JSON.parse(sessionStorage.getItem('uflow_chat') || '{}');
    expect(stored.conversationId).toBe('conv-1');
    expect(stored.messages).toHaveLength(2);
  });

  it('starts fresh when sessionStorage is empty (no regression to existing behavior)', () => {
    const { result } = renderHook(() => useChat());

    expect(result.current.messages).toHaveLength(0);
    expect(result.current.conversationId).toBeNull();
  });
});
