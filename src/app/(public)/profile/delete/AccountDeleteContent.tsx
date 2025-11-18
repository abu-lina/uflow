'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, AlertTriangle, Loader2, Lock } from 'lucide-react';

import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageContentWrapper } from '@/components/layout/PageContentWrapper';
import { TitleSection } from '@/components/layout/TitleSection';
import { BottomSpacer } from '@/components/layout/BottomSpacer';
import { useAuth } from '@/providers/auth-provider';
import { authService } from '@/features/auth/services/authService';
import { accountService } from '@/services/account';
import { BrokenHeartIcon } from '@/components/ui/BrokenHeartIcon';
import { Button } from '@/components/ui/Button';
import { IconWithTitle } from '@/components/ui/IconWithTitle';
import { BottomActionNavbar } from '@/components/ui/BottomActionNavbar';
import { useLanguage } from '@/providers/LanguageProvider';
import type { SupabaseUser } from '@/types/supabase-user';

interface AccountDeleteContentProps {
  user: SupabaseUser | null;
}

export function AccountDeleteContent({ user }: AccountDeleteContentProps) {
  const { user: clientUser, isLoading: loading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  
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
      setError(err instanceof Error ? err.message : t('profile.errorDeletingAccount'));
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
          <p className="text-gray-600">{t('profile.checkingAuth')}</p>
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
          <p className="text-gray-600">{t('profile.authRequired')}</p>
        </div>
      </div>
    );
  }

  return (
    <PageLayout hasBackground={false} maxWidth="full">
      <PageHeader 
        title={t('profile.deleteAccount')}
        variant="back-and-title"
        onBack={() => router.back()}
      />

      <HeaderSpacer />

      <PageContentWrapper includeMobileNavSpacing={false} maxWidth="full" padding="lg-safe">
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
              (() => {
                const titleText = t('profile.yourDataYourDecision');
                const parts = titleText.split('\n');
                return (
                  <>
                    {parts[0] || titleText}
                    {parts[1] && (
                      <>
                        <br />
                        {parts[1]}
                      </>
                    )}
                  </>
                );
              })()
            }
            titleClassName="font-inter-tight text-3xl font-medium leading-[39px] text-black"
          >
            <div className="w-full">
              <div className="font-inter text-[16px] font-light leading-[24px] text-black space-y-4 text-justify">
                <p>{t('profile.deleteAccountIntro')}</p>
                <p>{t('profile.deleteAccountWarning')}</p>
                <p>{t('profile.deleteAccountPrivacy')}</p>
              </div>
            </div>
          </IconWithTitle>
        </TitleSection>
      </PageContentWrapper>

      <BottomSpacer />

      {/* Bottom Action Navbar */}
      <BottomActionNavbar
        height="h-16"
        primaryButton={{
          label: t('profile.keepAccount'),
          disabled: isDeleting,
          onClick: () => router.push('/profile/edit'),
          'aria-label': t('profile.keepAccountAria'),
        }}
        secondaryButton={{
          icon: <Trash2 className="h-6 w-6 text-content-heading" />,
          disabled: isDeleting,
          loading: isDeleting,
          onClick: handleDeleteClick,
          'aria-label': t('profile.deleteAccountAria'),
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
                {t('profile.confirmDeleteTitle')}
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                {t('profile.confirmDeleteDescription')}
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button
                fullWidth
                className="flex-1"
                variant="cancel"
                onClick={handleCancelDelete}
              >
                {t('common.cancel')}
              </Button>
              <Button
                fullWidth
                className="flex-1"
                variant="danger"
                onClick={handleConfirmDelete}
              >
                {t('profile.confirmDelete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
