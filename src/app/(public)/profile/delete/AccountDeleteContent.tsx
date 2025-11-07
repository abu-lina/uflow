'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle, Loader2, Lock } from 'lucide-react';

import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { BottomSpacer } from '@/components/layout/BottomSpacer';
import { PageContentWrapper } from '@/components/layout/PageContentWrapper';
import { TitleSection } from '@/components/layout/TitleSection';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/features/auth/services/authService';
import { accountService } from '@/services/account';
import { BrokenHeartIcon } from '@/components/ui/BrokenHeartIcon';
import { Button, IconWithTitle } from '@/components/ui';
import { BottomActionNavbar } from '@/components/ui/BottomActionNavbar';
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
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Handle authentication state
  useEffect(() => {
    if (!loading && !effectiveUser) {
      router.replace('/login');
    }
  }, [effectiveUser, loading, router]);



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
          <Loader2 className="mb-4 h-8 w-8 animate-spin text-gray-600 mx-auto" />
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
          <Lock className="mb-4 h-8 w-8 text-gray-600 mx-auto" />
          <p className="text-gray-600">Anmeldung erforderlich</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-full max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl flex-col bg-gradient-to-b from-[#F5F5F5] to-[#FBFBFB]" style={{ height: '100dvh' }}>
      <PageHeader 
        title="Konto schließen"
        variant="back-and-title"
        onBack={() => router.back()}
      />

      <HeaderSpacer />

      <PageContentWrapper
        asMain
        centerVertically
        className="content-scroll-container overflow-y-auto"
        padding="lg-safe"
      >
        <div className="flex w-full flex-col">
          {/* Error Message */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4" role="alert">
              <p className="text-center text-red-600">{error}</p>
            </div>
          )}

          {/* Icon + Title + Text */}
          <TitleSection className="mb-10">
            <IconWithTitle
              icon={<BrokenHeartIcon size={96} />}
              size="large"
              title={
                <>
                  Deine Daten.
                  <br />
                  Deine Entscheidung.
                </>
              }
              titleClassName="font-inter-tight text-3xl font-medium leading-[39px] text-black"
            >
              <div className="w-full">
                <div className="font-inter text-[16px] font-light leading-[24px] text-black space-y-4 text-justify">
                  <p>Schade, dass du dein Konto löschen möchtest.</p>
                  <p>Bitte beachte: Die Löschung ist dauerhaft – alle deine Daten werden vollständig und sicher entfernt und können nicht wiederhergestellt werden.</p>
                  <p>Dein Konto ist für andere nie sichtbar, und deine Privatsphäre bleibt geschützt.</p>
                </div>
              </div>
            </IconWithTitle>
          </TitleSection>

        </div>
      </PageContentWrapper>

      <BottomSpacer height="h-16" />

      {/* Bottom Action Navbar */}
      <BottomActionNavbar
        height="h-16"
        primaryButton={{
          label: 'Konto behalten',
          disabled: isDeleting,
          onClick: () => router.push('/profile/edit'),
          'aria-label': 'Konto behalten und zurück zum Profil',
        }}
        secondaryButton={{
          icon: <Trash2 className="h-6 w-6 text-content-title" />,
          disabled: isDeleting,
          loading: isDeleting,
          onClick: handleDeleteClick,
          'aria-label': 'Konto dauerhaft löschen',
        }}
      />

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-8 w-8 text-[#D86363]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Konto wirklich löschen?
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Diese Aktion kann nicht rückgängig gemacht werden. Alle deine Daten werden dauerhaft gelöscht.
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button
                fullWidth
                className="flex-1"
                variant="cancel"
                onClick={handleCancelDelete}
              >
                Abbrechen
              </Button>
              <Button
                fullWidth
                className="flex-1"
                variant="danger"
                onClick={handleConfirmDelete}
              >
                Ja, löschen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
