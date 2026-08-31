'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronUp, Plus, Info, Sparkles } from 'lucide-react';
import { useChat } from '@/features/chat/hooks/useChat';
import { useLanguage } from '@/providers/LanguageProvider';
import { ChatMessage } from '@/features/chat/components/ChatMessage';
import { ChatInput } from '@/features/chat/components/ChatInput';
import { SuggestionCard } from '@/features/chat/components/SuggestionCard';

export function ChatWidget({ userName }: { userName?: string }) {
  const { messages, isLoading, error, sendMessage } = useChat();
  const { t } = useLanguage();
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
                <ChevronUp className="text-neutral-800" size={20} />
              </div>

              <SuggestionCard
                icon={<Sparkles className="text-primary" size={24} />}
                subtitle="Erhalte Empfehlungen"
                title="Empfehlung erhalten"
                onClick={() => sendMessage('Empfiehl mir etwas')}
              />

              <SuggestionCard
                icon={<Plus className="text-primary" size={24} />}
                subtitle="Registriere deinen Service"
                title="Registriere Dich"
                onClick={() => sendMessage('Ich möchte ein Restaurant registrieren')}
              />

              <SuggestionCard
                icon={<Info className="text-primary" size={24} />}
                subtitle="Welche Kriterien wenden wir an."
                title="Informationen"
                onClick={() => sendMessage('Welche Kriterien wendet UFlow an?')}
              />
            </div>

            {/* Fallback: form-based registration */}
            <p className="text-center text-sm text-[#7A7A7A]">
              {t('chat.fallback.prefix')}{' '}
              <Link
                className="text-primary font-medium underline underline-offset-2 hover:opacity-70 transition-opacity"
                href="/create/basics"
              >
                {t('chat.fallback.link')}
              </Link>
            </p>
          </div>
        )}

        {hasMessages && (
          <div className="">
            {messages.map((msg, i) => (
              <ChatMessage
                key={i}
                content={msg.content}
                options={msg.options}
                results={msg.results}
                role={msg.role}
                singleSelect={msg.singleSelect}
                onOptionSelect={(option) => sendMessage(option)}
              />
            ))}
            {isLoading && (
              <ChatMessage
                content=""
                isLoading={true}
                role="assistant"
              />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {error && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm mt-4">
            {error.includes('Authentication required') || error.includes('authentifizieren') ? (
              <>
                <p className="font-medium">{t('chat.authRequired.title')}</p>
                <p className="mt-1">
                  {t('chat.authRequired.body')}
                </p>
                <a
                  className="inline-block mt-3 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
                  href="/login"
                >
                  {t('chat.authRequired.action')}
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
                <p className="mt-2">
                  <a
                    className="text-primary font-medium underline underline-offset-2 hover:opacity-70 transition-opacity"
                    href="/create"
                  >
                    Zur manuellen Registrierung
                  </a>
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <ChatInput isLoading={isLoading} onSend={sendMessage} />
    </div>
  );
}
