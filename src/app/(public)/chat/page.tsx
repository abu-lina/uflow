'use client';

import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { ChatWidget } from '@/features/chat/components/ChatWidget';
import { useAuth } from '@/providers/auth-provider';

export default function ChatPage() {
  const router = useRouter();
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0];

  return (
    <div className="flex flex-col h-[100dvh] bg-transparent">
      <header className="fixed left-0 right-0 top-0 z-50 pt-[calc(env(safe-area-inset-top)+16px)] sm:pt-[calc(env(safe-area-inset-top)+24px)] pb-2 bg-transparent border-b border-transparent isolate -mx-px px-px">
        <div className="flex items-center w-full px-safe-24 h-header-height-mobile sm:h-header-height-tablet">
          <h1 className="flex-1 font-inter-tight text-xl font-semibold text-content-heading">
            Chat
          </h1>
          <button
            aria-label="Schließen"
            className="w-8 h-8 flex items-center justify-center -mr-1"
            onClick={() => router.back()}
          >
            <X className="text-content-heading" size={22} strokeWidth={2} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden mt-[calc(env(safe-area-inset-top)+16px+56px)] sm:mt-[calc(env(safe-area-inset-top)+24px+56px)]">
        <ChatWidget userName={userName} />
      </div>
    </div>
  );
}
