'use client';

import { useState, useRef, useCallback, type KeyboardEvent } from 'react';
import { ArrowUp } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
}

export function ChatInput({ onSend, isLoading = false }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;

    onSend(trimmed);
    setValue('');

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  }, [value, isLoading, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div
      className="flex items-end gap-2 border-t border-border/30 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      style={{
        background: 'linear-gradient(rgb(245, 245, 245) 0%, rgb(251, 251, 251) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.04), 0 -1px 2px rgba(0, 0, 0, 0.06)',
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nachricht schreiben..."
        disabled={isLoading}
        rows={1}
        className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white"
        aria-label="Chat message input"
      />
      <button
        onClick={handleSend}
        disabled={isLoading || !value.trim()}
        className="inline-flex items-center justify-center font-inter-tight text-base font-medium transition-all duration-150 ease-out disabled:opacity-50 active:scale-[0.98] bg-primary text-white hover:bg-primary-dark active:bg-primary-darker h-12 px-4 rounded-xl gap-2 shadow-[0_8px_24px_rgba(88,157,150,0.25)]"
        aria-label="Send message"
      >
        <ArrowUp size={18} strokeWidth={2.5} />
      </button>
    </div>
  );
}
