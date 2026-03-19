'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

import { useIsMobile } from '@/hooks/useIsMobile';
import { supabase } from '@/lib/supabase/client';
import { FooterAction } from '@/components/ui/FooterAction';

interface ProfileProviderDetailButtonsProps {
  providerId: string;
}

export function ProfileProviderDetailButtons({ providerId }: ProfileProviderDetailButtonsProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Cleanup function to clear any pending animations on unmount
    return () => {
      setIsClosing(false);
      setIsDragging(false);
    };
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (showActionsMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [showActionsMenu]);

  const closeActionsMenu = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowActionsMenu(false);
      setIsClosing(false);
      setDragY(0);
    }, 300); // Match transition duration
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    setStartY(touch.clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    // Prevent default to stop background scrolling
    e.preventDefault();

    const touch = e.touches[0];
    if (!touch) return;

    const currentY = touch.clientY;
    const diff = currentY - startY;

    // Only allow dragging down
    if (diff > 0) {
      setDragY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // If dragged down more than 100px, close the menu
    if (dragY > 100) {
      closeActionsMenu();
    } else {
      // Snap back to position
      setDragY(0);
    }

    setStartY(0);
  };

  const handleEditAction = () => {
    router.push(`/profile/providers/${providerId}/edit`);
  };

  const handleShareAction = async () => {
    closeActionsMenu();

    const shareUrl = `${window.location.origin}/providers/${providerId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Provider teilen',
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled — AbortError is an expected outcome, not a failure
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link in Zwischenablage kopiert!');
      } catch (error) {
        console.error('Failed to copy:', error);
        toast.error('Fehler beim Kopieren des Links');
      }
    }
  };

  const handleDeleteAction = () => {
    closeActionsMenu();
    setTimeout(() => {
      setShowDeleteConfirm(true);
    }, 300); // Wait for menu to close before showing confirmation
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      // Delete provider from database
      const { error } = await supabase.from('providers').delete().eq('provider_id', providerId);

      if (error) throw error;

      // Invalidate React Query cache to refresh provider list
      await queryClient.invalidateQueries({ queryKey: ['created-providers'] });
      await queryClient.invalidateQueries({ queryKey: ['saved-providers'] });

      toast.success('Provider erfolgreich gelöscht!');
      router.push('/profile');
    } catch (error) {
      console.error('Error deleting provider:', error);
      toast.error('Fehler beim Löschen des Providers');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  if (isMobile) {
    return (
      <>
        <FooterAction
          primaryButton={{
            label: 'Bearbeiten',
            icon: 'material-symbols:edit',
            onClick: handleEditAction,
            'aria-label': 'Provider bearbeiten',
            variant: 'primary',
          }}
          secondaryButton={{
            icon: 'material-symbols:more-horiz',
            onClick: () => setShowActionsMenu(true),
            'aria-label': 'Weitere Aktionen',
          }}
        />

        {/* Actions Menu Modal - Rendered via Portal */}
        {mounted &&
          showActionsMenu &&
          createPortal(
            <div
              className={`fixed inset-0 z-[9999] flex items-end bg-black/40 transition-opacity duration-300 ${
                isClosing ? 'opacity-0' : 'opacity-100'
              }`}
              onClick={closeActionsMenu}
            >
              <div
                className="relative z-[10000] w-full rounded-t-2xl bg-white pb-safe-bottom"
                style={{
                  transform: isClosing
                    ? 'translateY(100%)'
                    : dragY > 0
                      ? `translateY(${dragY}px)`
                      : 'translateY(0)',
                  transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onClick={(e) => e.stopPropagation()}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
                onTouchStart={handleTouchStart}
              >
                {/* Swipe Handle */}
                <div className="flex cursor-grab justify-center pb-2 pt-3 active:cursor-grabbing">
                  <div className="h-1 w-10 rounded-full bg-gray-300" />
                </div>

                <div className="flex flex-col p-4 pt-2">
                  {/* Share Action */}
                  <button
                    className="flex w-full items-center gap-3 rounded-lg p-4 transition-colors hover:bg-gray-50"
                    onClick={handleShareAction}
                  >
                    <Icon className="h-6 w-6 text-primary" icon="lucide:share-2" />
                    <span className="text-base font-medium text-[#232323]">Teilen</span>
                  </button>

                  {/* Divider */}
                  <div className="h-px w-full bg-gray-200" />

                  {/* Delete Action */}
                  <button
                    className="flex w-full items-center gap-3 rounded-lg p-4 transition-colors hover:bg-red-50"
                    onClick={handleDeleteAction}
                  >
                    <Icon className="h-6 w-6 text-red-500" icon="material-symbols:delete-outline" />
                    <span className="text-base font-medium text-red-500">Löschen</span>
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}

        {/* Delete Confirmation Modal - Rendered via Portal */}
        {mounted &&
          showDeleteConfirm &&
          createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[8px]"
              onClick={cancelDelete}
            >
              <div
                className="relative z-[10000] w-full max-w-sm rounded-2xl bg-white p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="mb-2 text-lg font-semibold text-[#232323]">Provider löschen?</h3>
                <p className="mb-6 text-sm text-gray-600">
                  Bist du sicher, dass du diesen Provider löschen möchtest? Diese Aktion kann nicht
                  rückgängig gemacht werden.
                </p>
                <div className="flex gap-3">
                  <button
                    className="flex-1 rounded-lg border border-gray-200 py-3 transition-colors hover:bg-gray-50"
                    onClick={cancelDelete}
                  >
                    <span className="text-base font-medium text-content">Abbrechen</span>
                  </button>
                  <button
                    className="flex-1 rounded-lg bg-red-500 py-3 transition-colors hover:bg-red-600 disabled:opacity-50"
                    disabled={isDeleting}
                    onClick={confirmDelete}
                  >
                    <span className="text-base font-medium text-white">
                      {isDeleting ? 'Löschen...' : 'Löschen'}
                    </span>
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}
      </>
    );
  }

  return (
    <>
      <FooterAction
        primaryButton={{
          label: 'Bearbeiten',
          icon: 'material-symbols:edit',
          onClick: handleEditAction,
          'aria-label': 'Provider bearbeiten',
          variant: 'primary',
        }}
        secondaryButton={{
          icon: 'material-symbols:more-horiz',
          onClick: () => setShowActionsMenu(true),
          'aria-label': 'Weitere Aktionen',
        }}
      />

      {/* Desktop More Actions Menu Container */}
      <div className="relative flex-1">
        {/* Desktop Actions Menu */}
        {mounted &&
          showActionsMenu &&
          createPortal(
            <>
              <div
                className="fixed inset-0 z-[9999] bg-black/40"
                onClick={() => setShowActionsMenu(false)}
              />
              <div className="fixed bottom-24 right-4 z-[10000] w-56 rounded-lg border border-gray-200 bg-white shadow-lg">
                <div className="py-2">
                  {/* Share Action */}
                  <button
                    className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
                    onClick={handleShareAction}
                  >
                    <Icon className="h-5 w-5 text-primary" icon="lucide:share-2" />
                    <span className="text-sm font-medium text-[#232323]">Teilen</span>
                  </button>

                  {/* Divider */}
                  <div className="my-1 h-px w-full bg-gray-200" />

                  {/* Delete Action */}
                  <button
                    className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-red-50"
                    onClick={handleDeleteAction}
                  >
                    <Icon className="h-5 w-5 text-red-500" icon="material-symbols:delete-outline" />
                    <span className="text-sm font-medium text-red-500">Löschen</span>
                  </button>
                </div>
              </div>
            </>,
            document.body,
          )}

        {/* Desktop Delete Confirmation Modal - Rendered via Portal */}
        {mounted &&
          showDeleteConfirm &&
          createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[8px]"
              onClick={cancelDelete}
            >
              <div
                className="relative z-[10000] w-full max-w-md rounded-2xl bg-white p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="mb-2 text-xl font-semibold text-[#232323]">Provider löschen?</h3>
                <p className="mb-6 text-sm text-gray-600">
                  Bist du sicher, dass du diesen Provider löschen möchtest? Diese Aktion kann nicht
                  rückgängig gemacht werden.
                </p>
                <div className="flex gap-3">
                  <button
                    className="flex-1 rounded-lg border border-gray-200 py-3 transition-colors hover:bg-gray-50"
                    onClick={cancelDelete}
                  >
                    <span className="text-base font-medium text-content">Abbrechen</span>
                  </button>
                  <button
                    className="flex-1 rounded-lg bg-red-500 py-3 transition-colors hover:bg-red-600 disabled:opacity-50"
                    disabled={isDeleting}
                    onClick={confirmDelete}
                  >
                    <span className="text-base font-medium text-white">
                      {isDeleting ? 'Löschen...' : 'Löschen'}
                    </span>
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}
      </div>
    </>
  );
}
