'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChatWidget } from '@/features/chat/components/ChatWidget';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useLanguage } from '@/providers/LanguageProvider';

export function ChatFloatingWidget() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  // Don't show FAB on /chat page — early return AFTER all hooks (Rules-of-Hooks)
  if (pathname === '/chat') return null;
  const userName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0];

  return (
    <>
      {/* FAB button */}
      <div className="fixed bottom-20 right-4 z-50 md:bottom-6 md:right-6">
        {!isOpen && (
          <button
            aria-label={t('chat.openChat')}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all hover:bg-primary-dark hover:shadow-xl"
            onClick={() => {
              if (window.innerWidth < 768) {
                router.push('/chat');
              } else {
                setIsOpen(true);
              }
            }}
          >
            <MessageCircle size={24} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Chat modal */}
      {isOpen && (
        <>
          {/* Overlay — shows app screen behind */}
          <div
            className="fixed inset-0 z-50 bg-black/30 md:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal panel */}
          <div className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl shadow-black/5 md:inset-auto md:bottom-20 md:right-4 md:h-[600px] md:max-h-[calc(100vh-100px)] md:w-[400px]">
            <div className="flex items-center justify-between rounded-t-3xl border-b border-gray-200 bg-primary px-4 py-3 text-white">
              <h3 className="text-sm font-semibold">{t('chat.assistantTitle')}</h3>
              <button
                aria-label={t('chat.closeChat')}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-primary-dark"
                onClick={() => setIsOpen(false)}
              >
                <svg
                  fill="none"
                  height="16"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2.5"
                  viewBox="0 0 24 24"
                  width="16"
                >
                  <line x1="18" x2="6" y1="6" y2="18" />
                  <line x1="6" x2="18" y1="6" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatWidget userName={userName} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
