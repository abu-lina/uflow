'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ChatWidget } from '@/features/chat/components/ChatWidget';
import { useAuth } from '@/providers/auth-provider';

export default function ChatPage() {
  const router = useRouter();
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0];

  return (
    <div className="flex flex-col h-[100dvh] bg-white">
      {/* Header — matching profile page style */}
      <header
        className="fixed left-0 right-0 top-0 z-50 pt-[calc(env(safe-area-inset-top)+16px)] sm:pt-[calc(env(safe-area-inset-top)+24px)] pb-2"
        style={{
          background: 'white',
          borderBottom: '1px solid #f3f4f6',
        }}
      >
        <div className="flex items-center w-full px-safe-24 h-header-height-mobile sm:h-header-height-tablet">
          <button
            onClick={() => router.back()}
            aria-label="Zurück"
            className="mr-3 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-content-heading" />
          </button>
          <h1 className="flex-1 font-inter-tight text-xl font-semibold text-content-heading">
            Chat
          </h1>
        </div>
      </header>

      {/* Chat content — offset for fixed header */}
      <div className="flex-1 overflow-hidden mt-[calc(env(safe-area-inset-top)+16px+56px)] sm:mt-[calc(env(safe-area-inset-top)+24px+56px)]">
        <ChatWidget userName={userName} />
      </div>
    </div>
  );
}
