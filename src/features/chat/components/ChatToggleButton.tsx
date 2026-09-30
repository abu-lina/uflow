'use client';

import { ChatIcon } from '@/components/ui/icons/ChatIcon';
import { useLanguage } from '@/providers/LanguageProvider';

interface ChatToggleButtonProps {
  isActive?: boolean;
  onClick: () => void;
}

export function ChatToggleButton({ isActive = false, onClick }: ChatToggleButtonProps) {
  const { t } = useLanguage();
  return (
    <button
      aria-label={t('chat.openChat')}
      className="flex items-center justify-center transition-opacity duration-75"
      style={{ width: 40, height: 40 }}
      onClick={onClick}
    >
      <ChatIcon isActive={isActive} />
    </button>
  );
}
