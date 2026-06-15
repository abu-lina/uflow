'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
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
          transition: 'background 300ms ease-in-out, backdrop-filter 300ms ease-in-out, -webkit-backdrop-filter 300ms ease-in-out, border-bottom 300ms ease-in-out',
          background: 'white',
          backdropFilter: 'none',
          borderBottom: '1px solid #f3f4f6',
          isolation: 'isolate',
          marginLeft: '-1px',
          marginRight: '-1px',
          paddingLeft: '1px',
          paddingRight: '1px',
        }}
      >
        <div className="flex items-center w-full px-safe-24 h-header-height-mobile sm:h-header-height-tablet">
          <button
            onClick={() => router.back()}
            aria-label="Zurück"
            className="flex items-center justify-center w-8 h-8 -ml-1"
          >
            <Icon
              icon="material-symbols:chevron-left"
              className="w-8 h-8 text-content-heading pointer-events-none"
            />
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
