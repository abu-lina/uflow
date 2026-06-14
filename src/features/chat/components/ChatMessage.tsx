'use client';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  isLoading?: boolean;
}

export function ChatMessage({ role, content, isLoading = false }: ChatMessageProps) {
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
        className={`px-4 py-3 rounded-2xl max-w-[80%] ${
          isUser
            ? 'bg-teal-600 text-white rounded-br-none'
            : isTool
              ? 'bg-gray-50 text-gray-500 text-xs italic rounded-bl-none'
              : 'bg-gray-100 text-gray-900 rounded-bl-none'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
