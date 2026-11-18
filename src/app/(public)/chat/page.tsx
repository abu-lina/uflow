'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { ChatWidget } from '@/features/chat/components/ChatWidget';
import { useAuth } from '@/providers/auth-provider';
import { getFeatureFlag } from '@/config/feature-flags';
import { useLanguage } from '@/providers/LanguageProvider';

export default function ChatPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const enableChatbot = getFeatureFlag('enableChatbot');

  useEffect(() => {
    if (!enableChatbot) {
      router.replace('/');
    }
  }, [enableChatbot, router]);

  if (!enableChatbot) {
    return null;
  }

  const userName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0];

  return (
    <div className="flex h-[100dvh] flex-col bg-transparent">
      <header className="fixed left-0 right-0 top-0 isolate z-50 -mx-px border-b border-transparent bg-transparent px-px pb-2 pt-[calc(env(safe-area-inset-top)+16px)] sm:pt-[calc(env(safe-area-inset-top)+24px)]">
        <div className="px-safe-24 flex h-header-height-mobile w-full items-center sm:h-header-height-tablet">
          <h1 className="flex-1 font-inter-tight text-xl font-semibold text-content-heading">
            {t('chat.pageTitle')}
          </h1>
          <button
            aria-label={t('common.close')}
            className="-mr-1 flex h-8 w-8 items-center justify-center"
            onClick={() => router.back()}
          >
            <X className="text-content-heading" size={22} strokeWidth={2} />
          </button>
        </div>
      </header>

      <div className="mt-[calc(env(safe-area-inset-top)+16px+56px)] flex-1 overflow-hidden sm:mt-[calc(env(safe-area-inset-top)+24px+56px)]">
        <ChatWidget userName={userName} />
      </div>
    </div>
  );
}
