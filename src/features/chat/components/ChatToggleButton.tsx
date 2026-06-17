'use client';

import { ChatIcon } from '@/components/ui/icons/ChatIcon';

interface ChatToggleButtonProps {
  isActive?: boolean;
  onClick: () => void;
}

export function ChatToggleButton({ isActive = false, onClick }: ChatToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Chat öffnen"
      className="flex items-center justify-center transition-opacity duration-75"
      style={{ width: 40, height: 40 }}
    >
      <ChatIcon isActive={isActive} />
    </button>
  );
}
