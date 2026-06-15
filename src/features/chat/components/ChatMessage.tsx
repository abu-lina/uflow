'use client';

import ReactMarkdown from 'react-markdown';
import { ProviderCard } from '@/features/chat/components/ProviderCard';
import { QuickReplies } from '@/features/chat/components/QuickReplies';
import type { ProviderCardData } from '@/features/chat/types';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  isLoading?: boolean;
  results?: ProviderCardData[];
  options?: string[];
  onOptionSelect?: (option: string) => void;
}


export function ChatMessage({ role, content, isLoading = false, results, options, onOptionSelect }: ChatMessageProps) {
  const isUser = role === 'user';
  const isTool = role === 'tool';

  if (isLoading && role === 'assistant') {
    return (
      <div data-role="assistant" className="flex justify-start mb-4">
        <div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-3 max-w-[80%]">
          <div data-testid="typing-indicator" className="flex gap-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-role={role}
      className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`${
          isUser
            ? 'bg-primary text-white rounded-2xl rounded-br-none px-4 py-3 max-w-[80%]'
            : isTool
              ? 'bg-gray-50 text-gray-500 text-xs italic rounded-2xl rounded-bl-none px-4 py-3 max-w-[80%]'
              : 'text-neutral-800 max-w-full px-4'
        }`}
      >
        {content && (
          <div className="text-sm leading-snug space-y-1">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
        {results && results.length > 0 && (
          <div className={content ? 'mt-2' : ''}>
            {results.map((provider) => (
              <ProviderCard key={provider.provider_id} provider={provider} />
            ))}
          </div>
        )}
        {options && onOptionSelect && role === 'assistant' && (
          <QuickReplies options={options} onSelect={onOptionSelect} disabled={isLoading} />
        )}
      </div>
    </div>
  );
}
