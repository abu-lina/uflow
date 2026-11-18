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
      className="flex items-end gap-2 border-t border-border/30 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3"
      style={{
        background: 'linear-gradient(rgb(245, 245, 245) 0%, rgb(251, 251, 251) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.04), 0 -1px 2px rgba(0, 0, 0, 0.06)',
      }}
    >
      <textarea
        ref={textareaRef}
        aria-label="Chat message input"
        autoCapitalize="sentences"
        autoCorrect="on"
        className="h-12 flex-1 resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isLoading}
        enterKeyHint="send"
        placeholder="Nachricht schreiben..."
        rows={1}
        spellCheck={true}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        aria-label="Send message"
        className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary font-inter-tight text-base font-medium text-white shadow-[0_8px_24px_rgba(88,157,150,0.25)] transition-all duration-150 ease-out hover:bg-primary-dark active:scale-[0.98] active:bg-primary-darker disabled:opacity-50"
        disabled={isLoading || !value.trim()}
        onClick={handleSend}
      >
        <ArrowUp size={24} strokeWidth={2.5} />
      </button>
    </div>
  );
}
