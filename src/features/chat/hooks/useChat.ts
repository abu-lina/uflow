'use client';

import { useState, useCallback } from 'react';
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

  const sendMessage = useCallback(
    async (content: string) => {
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

        const data = await response.json();

        if (!conversationId && data.conversation_id) {
          setConversationId(data.conversation_id);
        }

        const assistantMessage: ChatMessage = {
          role: data.message.role || 'assistant',
          content: data.message.content || '',
          results: data.results,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId],
  );

  return {
    messages,
    isLoading,
    error,
    conversationId,
    sendMessage,
  };
}
