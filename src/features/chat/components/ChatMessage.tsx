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

const bubbleStyles: Record<string, string> = {
  user: 'bg-gray-100 text-neutral-800 rounded-2xl rounded-br-none px-4 py-3 max-w-[80%]',
  tool: 'bg-gray-50 text-gray-500 text-xs italic rounded-2xl rounded-bl-none px-4 py-3 max-w-[80%]',
  assistant: 'text-neutral-800 w-full',
};

export function ChatMessage({ role, content, isLoading = false, results, options, onOptionSelect }: ChatMessageProps) {
  if (isLoading && role === 'assistant') {
    return (
      <div data-role="assistant" className="flex mb-4 px-6">
        <div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-3">
          <div data-testid="typing-indicator" className="flex gap-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  const isUser = role === 'user';
  const bubbleClass = bubbleStyles[role] || bubbleStyles.assistant;

  return (
    <div data-role={role} className={`flex mb-4 px-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={bubbleClass}>
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
