'use client';

import { useState } from 'react';
import { ChatWidget } from '@/features/chat/components/ChatWidget';
import { MessageCircle } from 'lucide-react';

export function ChatFloatingWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* FAB button */}
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Chat öffnen"
            className="w-14 h-14 rounded-full bg-primary text-white shadow-lg hover:bg-primary-dark hover:shadow-xl transition-all flex items-center justify-center"
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
            className="fixed inset-0 bg-black/30 z-50 md:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal panel */}
          <div className="fixed inset-2 md:inset-auto md:bottom-20 md:right-4 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden md:w-[400px] md:h-[600px] md:max-h-[calc(100vh-100px)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-primary text-white rounded-t-2xl">
              <h3 className="font-semibold text-sm">UFlow Assistant</h3>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Chat schließen"
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary-dark transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatWidget />
            </div>
          </div>
        </>
      )}
    </>
  );
}
