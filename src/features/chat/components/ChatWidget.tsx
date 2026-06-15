'use client';

import { useRef, useEffect } from 'react';
import { useChat } from '@/features/chat/hooks/useChat';
import { ChatMessage } from '@/features/chat/components/ChatMessage';
import { ChatInput } from '@/features/chat/components/ChatInput';

export function ChatWidget() {
  const { messages, isLoading, error, sendMessage } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto p-4">
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 px-4">
            <div className="w-16 h-16 mb-4 rounded-full bg-teal-100 flex items-center justify-center">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#589D96"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              UFlow Assistant
            </h3>
            <p className="text-sm max-w-[280px]">
              Ich helfe dir, Restaurants, Geschäfte und Community-Dienste zu
              finden oder zu registrieren. Wie kann ich dir helfen?
            </p>
          </div>
        )}

        {hasMessages && (
          <div className="space-y-1">
            {messages.map((msg, i) => (
              <ChatMessage
                key={i}
                role={msg.role}
                content={msg.content}
                results={msg.results}
                options={msg.options}
                onOptionSelect={(option) => sendMessage(option)}
              />
            ))}
            {isLoading && (
              <ChatMessage
                role="assistant"
                content=""
                isLoading={true}
              />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {error && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm mt-4">
            {error.includes('Authentication required') || error.includes('authentifizieren') ? (
              <>
                <p className="font-medium">Anmeldung erforderlich</p>
                <p className="mt-1">
                  Um ein Restaurant zu registrieren, musst du angemeldet sein.
                </p>
                <a
                  href="/login"
                  className="inline-block mt-3 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Jetzt anmelden
                </a>
              </>
            ) : error.includes('unavailable') || error.includes('temporarily') || error.includes('rate limited') || error.includes('429') ? (
              <>
                <p className="font-medium">Der Dienst ist kurzzeitig nicht erreichbar</p>
                <p className="mt-1">
                  Bitte versuche es in ein paar Sekunden erneut. Der Chatbot versucht es automatisch.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium">Entschuldigung, ein Fehler ist aufgetreten.</p>
                <p className="text-amber-700 mt-1">{error}</p>
              </>
            )}
          </div>
        )}
      </div>

      <ChatInput onSend={sendMessage} isLoading={isLoading} />
    </div>
  );
}
