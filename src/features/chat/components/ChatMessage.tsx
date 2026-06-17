'use client';

import ReactMarkdown from 'react-markdown';
import { QuickReplies } from '@/features/chat/components/QuickReplies';
import { SuggestionCard } from '@/features/chat/components/SuggestionCard';
import { getRecommendationIcon } from '@/utils/chat-icons';
import { UtensilsCrossed, Store, Heart } from 'lucide-react';
import type { ProviderCardData } from '@/features/chat/types';
import type { ReactNode } from 'react';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  isLoading?: boolean;
  results?: ProviderCardData[];
  options?: string[];
  onOptionSelect?: (option: string) => void;
  singleSelect?: boolean;
}

const bubbleStyles: Record<string, string> = {
  user: 'bg-gray-200 text-neutral-800 rounded-2xl rounded-br-none px-4 py-3 max-w-[80%]',
  tool: 'bg-gray-50 text-gray-500 text-xs italic rounded-2xl rounded-bl-none px-4 py-3 max-w-[80%]',
  assistant: 'text-neutral-800 w-full',
};

function getProviderIcon(listingType: string | null): ReactNode {
  switch (listingType) {
    case 'food':
      return <UtensilsCrossed className="text-primary" size={24} />;
    case 'store':
      return <Store className="text-primary" size={24} />;
    case 'ummah':
      return <Heart className="text-primary" size={24} />;
    default:
      return <Store className="text-primary" size={24} />;
  }
}

export function ChatMessage({ role, content, isLoading = false, results, options, onOptionSelect, singleSelect }: ChatMessageProps) {
  if (isLoading && role === 'assistant') {
    return (
      <div className="flex my-4 px-6" data-role="assistant">
        <div className="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-3">
          <div className="flex gap-1" data-testid="typing-indicator">
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
    <div className={`flex my-4 px-6 ${isUser ? 'justify-end' : 'justify-start'}`} data-role={role}>
      <div className={bubbleClass}>
        {content && (!results || results.length === 0) && (
          <div className="text-sm leading-snug space-y-1">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
        {results && results.length > 0 && (
          <div className="flex flex-col gap-3 mt-2">
            {results.map((provider) => (
              <SuggestionCard
                key={provider.provider_id}
                icon={getProviderIcon(provider.listing_type)}
                title={provider.provider_name}
                subtitle={[provider.address_city, provider.category_name].filter(Boolean).join(' | ')}
                href={`/providers/${provider.provider_id}`}
              />
            ))}
          </div>
        )}
        {options && onOptionSelect && role === 'assistant' && (
          singleSelect ? (
            <div className="flex flex-col gap-3 mt-3">
              {options.map((option) => (
                <SuggestionCard
                  key={option}
                  disabled={isLoading}
                  icon={getRecommendationIcon(option)}
                  title={option.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')}
                  onClick={() => onOptionSelect(option)}
                />
              ))}
            </div>
          ) : (
            <QuickReplies disabled={isLoading} options={options} singleSelect={singleSelect} onSelect={onOptionSelect} />
          )
        )}
      </div>
    </div>
  );
}
