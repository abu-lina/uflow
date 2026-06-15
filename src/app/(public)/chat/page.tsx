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
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
        <button
          onClick={() => router.back()}
          aria-label="Zurück"
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={20} className="text-neutral-800" />
        </button>
        <h1 className="text-lg font-semibold text-neutral-800">Chat</h1>
      </div>

      {/* Chat content */}
      <div className="flex-1 overflow-hidden">
        <ChatWidget userName={userName} />
      </div>
    </div>
  );
}
