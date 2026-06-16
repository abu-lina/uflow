'use client';

import { useRef, useEffect } from 'react';
import { ChevronUp, Plus, Info, Sparkles } from 'lucide-react';
import { useChat } from '@/features/chat/hooks/useChat';
import { ChatMessage } from '@/features/chat/components/ChatMessage';
import { ChatInput } from '@/features/chat/components/ChatInput';

export function ChatWidget({ userName }: { userName?: string }) {
  const { messages, isLoading, error, sendMessage } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {!hasMessages && (
          <div className="flex flex-col h-full px-5 pt-8 pb-8 gap-8 overflow-y-auto">
            {/* Greeting */}
            <div className="flex flex-col">
              <span className="text-[#60606F] text-base font-medium leading-snug">
                As-Salamu-Aleikum{userName ? ` ${userName}` : ''},
              </span>
              <span className="text-primary text-xl font-semibold leading-snug">
                Wie kann ich dir helfen?
              </span>
            </div>

            {/* Suggestion cards */}
            <div className="flex flex-col gap-4 bg-white rounded-xl p-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="font-inter-tight text-lg font-semibold text-text-primary">
                  Dinge die du tun kannst!
                </span>
                <ChevronUp size={20} className="text-neutral-800" />
              </div>

              {/* Card 1: Empfehlung */}
              <button
                onClick={() => sendMessage('Empfiehl mir etwas')}
                className="flex items-center gap-4 text-left"
              >
                <div className="w-12 h-12 rounded-[10px] bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={24} className="text-primary" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <div className="font-inter-tight text-base font-semibold text-text-primary">Empfehlung erhalten</div>
                  <div className="font-inter text-sm text-text-muted">Erhalte Empfehlungen</div>
                </div>
              </button>

              {/* Card 2: Registrieren */}
              <button
                onClick={() => sendMessage('Ich möchte ein Restaurant registrieren')}
                className="flex items-center gap-4 text-left"
              >
                <div className="w-12 h-12 rounded-[10px] bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Plus size={24} className="text-primary" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <div className="font-inter-tight text-base font-semibold text-text-primary">Registriere Dich</div>
                  <div className="font-inter text-sm text-text-muted">Registriere deinen Service</div>
                </div>
              </button>

              {/* Card 3: Informationen */}
              <button
                onClick={() => sendMessage('Welche Kriterien wendet UFlow an?')}
                className="flex items-center gap-4 text-left"
              >
                <div className="w-12 h-12 rounded-[10px] bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Info size={24} className="text-primary" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <div className="font-inter-tight text-base font-semibold text-text-primary">Informationen</div>
                  <div className="font-inter text-sm text-text-muted">Welche Kriterien wenden wir an.</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {hasMessages && (
          <div className="space-y-2">
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
                  className="inline-block mt-3 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
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
