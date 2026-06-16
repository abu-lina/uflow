'use client';

import { useState, useCallback, useRef } from 'react';
import type { ChatMessage } from '@/features/chat/types';

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
  sendMessage: (content: string) => Promise<void>;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const sendingRef = useRef(false);

  const sendMessage = useCallback(
    async (content: string) => {
      if (sendingRef.current || isLoading) return;
      sendingRef.current = true;
      setError(null);
      setIsLoading(true);

      const userMessage: ChatMessage = { role: 'user', content };
      setMessages((prev) => [...prev, userMessage]);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content,
            conversation_id: conversationId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Chat request failed');
        }

        // Check if response is SSE (streaming) or JSON
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('text/event-stream')) {
          // SSE streaming response
          const reader = response.body?.getReader();
          if (!reader) throw new Error('No response body');

          const decoder = new TextDecoder();
          let buffer = '';
          let streamedContent = '';
          let streamedConvId: string | null = null;

          // Add placeholder assistant message that we'll update
          setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6);
              if (data === '[DONE]') break;

              try {
                const parsed = JSON.parse(data);
                
                if (parsed.conversation_id) {
                  streamedConvId = parsed.conversation_id;
                  setConversationId(parsed.conversation_id);
                }
                
                if (parsed.options) {
                  // Update last message with options
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last && last.role === 'assistant') {
                      updated[updated.length - 1] = { ...last, options: parsed.options };
                    }
                    return updated;
                  });
                  continue;
                }
                if (parsed.content) {
                  streamedContent += parsed.content;
                  // Update the last message progressively
                  setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last && last.role === 'assistant') {
                      updated[updated.length - 1] = { ...last, content: streamedContent };
                    }
                    return updated;
                  });
                }
              } catch {
                // Skip unparseable
              }
            }
          }

          // If stream produced no content, add empty message
          if (!streamedContent) {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === 'assistant' && !last.content) {
                updated[updated.length - 1] = { ...last, content: 'Entschuldigung, ich konnte keine Antwort generieren.' };
              }
              return updated;
            });
          }
        } else {
          // Standard JSON response
          const data = await response.json();

          if (!conversationId && data.conversation_id) {
            setConversationId(data.conversation_id);
          }

          const assistantMessage: ChatMessage = {
            role: data.message.role || 'assistant',
            content: data.message.content || '',
            results: data.results,
            options: data.options,
          };

          setMessages((prev) => [...prev, assistantMessage]);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(message);
      } finally {
        setIsLoading(false);
        sendingRef.current = false;
      }
    },
    [conversationId, isLoading],
  );

  return {
    messages,
    isLoading,
    error,
    conversationId,
    sendMessage,
  };
}
