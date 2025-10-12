'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/features/auth/services/authService';
import { accountService } from '@/services/account';
import { BrokenHeartIcon } from '@/components/ui/BrokenHeartIcon';
import type { SupabaseUser } from '@/types/supabase-user';

interface AccountDeleteContentProps {
  user: SupabaseUser | null;
}

export function AccountDeleteContent({ user }: AccountDeleteContentProps) {
  const { user: clientUser, loading } = useAuth();
  const router = useRouter();
  
  // Use client-side user if server-side user is null
  const effectiveUser: SupabaseUser | null = user || (clientUser as SupabaseUser | null);
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHeaderSticky, setIsHeaderSticky] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<Element | null>(null);

  // Handle authentication state
  useEffect(() => {
    if (!loading && !effectiveUser) {
      router.replace('/login');
    }
  }, [effectiveUser, loading, router]);

  // Scroll detection for sticky header with iOS boundary handling
  useEffect(() => {
    // Use setTimeout to ensure DOM is ready (fixes iOS initial scroll issue)
    const timer = setTimeout(() => {
      scrollContainerRef.current = document.querySelector('.content-scroll-container');
      const contentContainer = scrollContainerRef.current;
      
      if (!contentContainer) return;
      
      const SCROLL_THRESHOLD = 10; // Min px at top before header can hide
      const MIN_SCROLL_DELTA = 8; // Increased for iOS sensitivity
      const BOUNDARY_BUFFER = 50; // Buffer zone for bottom boundary (iOS rubber band)
      
      let ticking = false; // Throttle using requestAnimationFrame
      
      const handleScroll = () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const currentScrollY = contentContainer?.scrollTop || 0;
            const scrollDifference = currentScrollY - lastScrollY.current;
            
            // Calculate if we're near the bottom (iOS rubber band protection)
            const scrollHeight = contentContainer.scrollHeight;
            const clientHeight = contentContainer.clientHeight;
            const distanceFromBottom = scrollHeight - clientHeight - currentScrollY;
            const isNearBottom = distanceFromBottom < BOUNDARY_BUFFER;
            
            // Ignore tiny scroll movements to prevent jitter
            if (Math.abs(scrollDifference) < MIN_SCROLL_DELTA) {
              ticking = false;
              return;
            }
            
            // Ignore scroll changes when near bottom (iOS rubber band effect)
            if (isNearBottom) {
              ticking = false;
              return;
            }
            
            // Always show header when at the top
            if (currentScrollY <= SCROLL_THRESHOLD) {
              setIsHeaderSticky(true);
            }
            // Hide when scrolling down (past threshold)
            else if (scrollDifference > 0) {
              setIsHeaderSticky(false);
            }
            // Show when scrolling up (past threshold)
            else if (scrollDifference < 0) {
              setIsHeaderSticky(true);
            }
            
            lastScrollY.current = currentScrollY;
            ticking = false;
          });
          
          ticking = true;
        }
      };

      contentContainer.addEventListener('scroll', handleScroll, { passive: true });
      
      return () => {
        contentContainer.removeEventListener('scroll', handleScroll);
      };
    }, 100); // Small delay to ensure DOM is ready

    return () => clearTimeout(timer);
  }, []);


  const handleDeleteClick = () => {
    setShowConfirmation(true);
  };

  const handleCancelDelete = () => {
    setShowConfirmation(false);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setError(null);
    setShowConfirmation(false);

    try {
      if (!effectiveUser?.id) {
        throw new Error('User ID not found');
      }

      // Perform hard deletion from database
      await accountService.deleteAccount(effectiveUser.id);
      
      // Sign out the user
      await authService.signOut();
      
      // Redirect to home page
      router.push('/?auth=required');
    } catch (err) {
      console.error('Error deleting account:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen des Kontos');
    } finally {
      setIsDeleting(false);
    }
  };

  // Show loading while auth is being checked
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-2xl">🔄</div>
          <p className="text-gray-600">Überprüfe Anmeldung...</p>
        </div>
      </div>
    );
  }

  // Show authentication required if no user
  if (!effectiveUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-2xl">🔐</div>
          <p className="text-gray-600">Anmeldung erforderlich</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-full max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]" style={{ height: '100dvh' }}>
      <PageHeader 
        isVisible={isHeaderSticky}
        rightContent={<BrokenHeartIcon size={24} />}
        title="Konto schließen"
        onBack={() => router.back()}
      />

      <div className={`transition-all duration-300 ${
        isHeaderSticky ? 'h-[calc(env(safe-area-inset-top)+24px+40px)]' : 'h-0'
      }`} />

      <main className="content-scroll-container flex flex-1 flex-col items-center px-4 pt-8 mobile-nav-spacing overflow-y-auto">
        <div className="flex w-full max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl flex-1 flex-col">
          {/* Error Message */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4" role="alert">
              <p className="text-center text-red-600">{error}</p>
            </div>
          )}

          {/* Content Section */}
          <section className="flex flex-1 flex-col items-center justify-center">
            {/* Title */}
            <header className="mb-4 w-full">
              <h2 className="text-left font-inter-tight text-3xl font-medium leading-[39px] text-black">
                Deine Daten.<br />
                Deine Entscheidung.
              </h2>
            </header>
            
            {/* Description */}
            <div className="mb-8 w-full space-y-4 text-left">
              <p className="font-inter text-[16px] font-light leading-[19px] text-black">
                Schade, dass du dein Konto löschen möchtest.
              </p>
              <p className="font-inter text-[16px] font-light leading-[19px] text-black">
                Bitte beachte: Die Löschung ist dauerhaft – alle deine Daten werden vollständig und sicher entfernt und können nicht wiederhergestellt werden.
              </p>
              <p className="font-inter text-[16px] font-light leading-[19px] text-black">
                Dein Konto ist für andere nie sichtbar, und deine Privatsphäre bleibt geschützt.
              </p>
            </div>

            {/* Visual Icon */}
            <figure className="mb-8 flex h-[144px] w-[144px] items-center justify-center">
              <BrokenHeartIcon size={144} />
            </figure>
          </section>
        </div>
      </main>

      {/* Custom Footer - replaces mobile navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/10 backdrop-blur-3xl border-t border-white/20">
        <div className="flex h-16 w-full max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-auto items-center gap-2 px-4">
          {/* Keep Account Button */}
          <button
            aria-label="Konto behalten und zurück zum Profil"
            className="flex-1 rounded-xl py-3 font-inter font-semibold text-base text-white transition-all duration-300 disabled:opacity-50 bg-[#589D96] hover:bg-[#4a8a84]"
            disabled={isDeleting}
            onClick={() => router.push('/profile/edit')}
          >
            Konto behalten
          </button>

          {/* Delete Account Button */}
          <button
            aria-label="Konto dauerhaft löschen"
            className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 disabled:opacity-50 ${
              isDeleting 
                ? 'bg-gray-400 hover:bg-gray-400' 
                : 'bg-[#EEEEEE] hover:bg-gray-300'
            }`}
            disabled={isDeleting}
            onClick={handleDeleteClick}
          >
            {isDeleting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-content-title border-t-transparent" />
            ) : (
              <Icon aria-hidden="true" className="h-5 w-5 text-content-title" icon="lucide:trash-2" />
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <Icon className="h-8 w-8 text-red-600" icon="lucide:alert-triangle" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Konto wirklich löschen?
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Diese Aktion kann nicht rückgängig gemacht werden. Alle deine Daten werden dauerhaft gelöscht.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                className="flex-1 rounded-xl bg-gray-200 py-3 font-inter font-semibold text-base text-gray-700 transition-colors hover:bg-gray-300"
                onClick={handleCancelDelete}
              >
                Abbrechen
              </button>
              <button
                className="flex-1 rounded-xl bg-red-600 py-3 font-inter font-semibold text-base text-white transition-colors hover:bg-red-700"
                onClick={handleConfirmDelete}
              >
                Ja, löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
