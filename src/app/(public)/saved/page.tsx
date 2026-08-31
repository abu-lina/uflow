'use client';

import { useMemo, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
// Material Symbols icon imports removed - using @iconify/react Icon component instead

import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageContent } from '@/components/layout/PageContent';
import { PageContentWrapper } from '@/components/layout/PageContentWrapper';
import { TitleSection } from '@/components/layout/TitleSection';
import { ContentSection } from '@/components/layout/ContentSection';
import { SelectableCard } from '@/components/shared/SelectableCard';
import { HomeSearchBar } from '@/features/search/components/HomeSearchBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { TitleAndText } from '@/components/ui/TitleAndText';
import { Icon } from '@/components/ui/Icon';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { FormInput } from '@/components/ui/FormInput';
import { FormInputGroup } from '@/components/ui/FormInputGroup';
import { LinkButton } from '@/components/ui/LinkButton';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { useSearch } from '@/providers/search-provider';
import { deleteBookmark } from '@/services/bookmarks';
import { getAllBookmarkedItems } from '@/services/providers';
import { getFirstImageUrl, formatProviderAddress, getAllTrustedImageUrlsWithFallback, PLACEHOLDER_IMAGE, parseCategoryImages, getCategoryCardBackgroundColor } from '@/utils/imageUtils';
import { useLanguage } from '@/providers/LanguageProvider';
import { signInWithEmailConfirmation, signInWithMagicLink } from '@/lib/auth';
import { useAppStage } from '@/hooks/useAppStage';
import EmailVerificationAlert from '@/components/ui/EmailVerificationAlert';

export default function SavedProvidersPage() {
  const { user, isLoading: userLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { searchQuery, setSearchQuery, selectedLocation, selectedSection } = useSearch();
  const { t } = useLanguage();
  const { stage } = useAppStage();
  
  // Determine if we should use magic link (Stage 2) or password (Stage 3)
  const useMagicLink = stage === 'stage2';
  
  // Login form state
  const [loginFormData, setLoginFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isEmailConfirmationError, setIsEmailConfirmationError] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Use React Query for all bookmarked items (providers + community services)
  // Show cached data immediately while refetching in background
  const { data: providers = [], isLoading, error: queryError } = useQuery({
    queryKey: ['saved-providers', user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        return await getAllBookmarkedItems(user.id);
      } catch (error) {
        console.error('Error loading saved items:', error);
        throw error;
      }
    },
    enabled: !!user && !userLoading,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
    // Show cached data immediately while refetching
    placeholderData: (previousData) => previousData,
  });


  // Listen for bookmark change events to refresh the saved list
  useEffect(() => {
    const handleBookmarkChange = () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['saved-providers', user.id] });
      }
    };

    window.addEventListener('bookmark-changed', handleBookmarkChange);
    return () => window.removeEventListener('bookmark-changed', handleBookmarkChange);
  }, [user, queryClient]);

  // Filter providers based on search query and location
  const filteredProviders = useMemo(() => {
    let filtered = providers;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((provider) => {
        const nameMatch = provider.name?.toLowerCase().includes(query);
        const addressMatch = 
          provider.address_street?.toLowerCase().includes(query) ||
          provider.address_city?.toLowerCase().includes(query);
        const categoryMatch = provider.category?.name_de?.toLowerCase().includes(query);
        return nameMatch || addressMatch || categoryMatch;
      });
    }

    // Filter by location
    // Empty string or falsy = "all locations" (canonical sentinel from search-provider)
    if (selectedLocation) {
      if (selectedLocation === 'Online') {
        // Filter for online businesses (no city)
        filtered = filtered.filter((provider) => 
          !provider.address_city || provider.address_city.trim() === ''
        );
      } else {
        // Filter for specific city
        filtered = filtered.filter((provider) => 
          provider.address_city?.toLowerCase() === selectedLocation.toLowerCase()
        );
      }
    }

    return filtered;
  }, [providers, searchQuery, selectedLocation]);

  const handleUnsave = useCallback(async (providerId: string, _isCommunityService: boolean) => {
    if (!user) return;
    
    try {
      const bookmarkQuery = supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider_id', providerId);

      const { data: bookmark, error: fetchError } = await bookmarkQuery.maybeSingle();
      
      if (fetchError) {
        console.error('Error fetching bookmark:', fetchError);
        return;
      }
      
      if (bookmark) {
        await deleteBookmark(bookmark.id);
        
        // Optimistically update both caches
        queryClient.setQueryData(['saved-providers', user.id], (old: typeof providers = []) => 
          old.filter((s) => s.id !== providerId)
        );
        
        queryClient.setQueryData(['bookmarks', user.id], (old: string[] = []) =>
          old.filter((id) => id !== providerId)
        );
      }
    } catch (err) {
      console.error(t('saved.errorRemovingItem'), err);
    }
  }, [user, queryClient, t]);

  const handleProviderClick = useCallback((providerId: string, isUmmah: boolean) => {
    const detailPath = isUmmah 
      ? `/community-services/${providerId}`
      : `/providers/${providerId}`;
    router.push(detailPath);
  }, [router]);

  const handleResendConfirmation = useCallback(async () => {
    if (!loginFormData.email) {
      setLoginError('Bitte gib zuerst deine E-Mail-Adresse ein.');
      return;
    }

    setIsLoginLoading(true);
    setLoginError(null);

    try {
      const tokenResponse = await fetch('/api/generate-confirmation-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginFormData.email,
          type: 'signup',
        }),
      });

      if (!tokenResponse.ok) {
        setLoginError('Bestätigungs-E-Mail konnte nicht gesendet werden.');
        toast.error('E-Mail konnte nicht gesendet werden', {
          description: 'Bitte versuche es später erneut.',
          duration: 4000,
        });
        return;
      }

      const { token } = await tokenResponse.json();
      const siteUrl = (typeof window !== 'undefined' ? window.location.origin : '') || process.env.NEXT_PUBLIC_SITE_URL || '';
      const confirmationUrl = `${siteUrl}/auth/confirm?token=${token}&email=${encodeURIComponent(loginFormData.email)}`;

      const emailResponse = await fetch('/api/send-auth-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: loginFormData.email,
          type: 'confirmSignup',
          language: t('common.language') || 'de',
          confirmationUrl,
        }),
      });

      if (emailResponse.ok) {
        setLoginError('Bestätigungs-E-Mail wurde gesendet. Bitte überprüfe dein Postfach.');
        setIsEmailConfirmationError(false);
        toast.success('E-Mail gesendet', {
          description: 'Bitte überprüfe dein Postfach.',
          duration: 4000,
        });
      } else {
        setLoginError('Bestätigungs-E-Mail konnte nicht gesendet werden.');
        toast.error('E-Mail konnte nicht gesendet werden', {
          description: 'Bitte versuche es später erneut.',
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Resend confirmation error:', error);
      setLoginError('Ein Fehler ist aufgetreten. Bitte versuche es später erneut.');
      toast.error('Fehler', {
        description: 'Bitte versuche es später erneut.',
        duration: 4000,
      });
    } finally {
      setIsLoginLoading(false);
    }
  }, [loginFormData.email, t]);

  const handleLoginSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoginLoading(true);
    setLoginError(null);
    setMagicLinkSent(false);

    try {
      if (useMagicLink) {
        // Stage 2: Use magic link (email-only)
        const { data, error } = await signInWithMagicLink(loginFormData.email, t('common.language') as 'en' | 'de' | 'ar' | 'tr' || 'de');
        
        if (error) {
          if (error.message === 'EMAIL_NOT_CONFIRMED') {
            setLoginError('Bitte überprüfe deine E-Mail und bestätige deine Registrierung vor der Anmeldung.');
            setIsEmailConfirmationError(true);
          } else if (error.message === 'EMAIL_NOT_FOUND') {
            setLoginError('Diese E-Mail-Adresse ist nicht registriert. Bitte erstelle zuerst ein Konto.');
            setIsEmailConfirmationError(false);
          } else {
            const errorMessage = error.message || 'Fehler beim Senden des Magic Links. Bitte versuche es erneut.';
            setLoginError(errorMessage);
            setIsEmailConfirmationError(false);
            
            // Show diagnostic URL if available
            const diagnosticUrl = 'diagnosticUrl' in error && typeof error.diagnosticUrl === 'string' 
              ? error.diagnosticUrl 
              : undefined;
            const toastDescription = diagnosticUrl 
              ? `Bitte besuche diese URL für Diagnose: ${diagnosticUrl}`
              : 'Bitte versuche es erneut oder kontaktiere den Support.';
            
            toast.error('Magic Link fehlgeschlagen', {
              description: toastDescription,
              duration: 8000,
            });
          }
          return;
        }

        // Success - magic link sent
        if (data) {
          setMagicLinkSent(true);
          toast.success('Magic Link gesendet', {
            description: 'Bitte überprüfe deine E-Mail und klicke auf den Link zum Anmelden.',
            duration: 5000,
          });
          // Clear email field
          setLoginFormData({ email: '', password: '' });
          setLoginError(null);
          setIsEmailConfirmationError(false);
        }
      } else {
        // Stage 3: Use password authentication
        const { data, error } = await signInWithEmailConfirmation(loginFormData.email, loginFormData.password);
        
        if (error) {
          if (error.message === 'EMAIL_NOT_CONFIRMED') {
            setLoginError('Bitte überprüfe deine E-Mail und bestätige deine Registrierung vor der Anmeldung.');
            setIsEmailConfirmationError(true);
          } else if (error.message === 'EMAIL_NOT_FOUND') {
            setLoginError('Diese E-Mail-Adresse ist nicht registriert. Bitte erstelle zuerst ein Konto.');
            setIsEmailConfirmationError(false);
          } else {
            setLoginError('Ungültige E-Mail oder Passwort. Bitte versuche es erneut.');
            setIsEmailConfirmationError(false);
            toast.error('Anmeldung fehlgeschlagen', {
              description: 'Bitte überprüfe deine Anmeldedaten und versuche es erneut.',
              duration: 4000,
            });
          }
          return;
        }

        // Success - user will be automatically updated via auth provider
        // The page will re-render and show saved items
        if (data) {
          toast.success('Erfolgreich angemeldet');
          // Clear form
          setLoginFormData({ email: '', password: '' });
          setLoginError(null);
          setIsEmailConfirmationError(false);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError(t('login.unexpectedError') || 'Ein unerwarteter Fehler ist aufgetreten.');
      setIsEmailConfirmationError(false);
    } finally {
      setIsLoginLoading(false);
    }
  }, [loginFormData, useMagicLink, t]);

  // Render empty state based on current state
  const renderEmptyState = () => {
    if (!user) {
      return 'login_required';
    }

    if (providers.length === 0) {
      return 'no_saved_items';
    }

    if (filteredProviders.length === 0) {
      return 'no_results';
    }

    return null;
  };

  const emptyStateType = renderEmptyState();

  // Always show page structure - never show full-page loading screen
  // Show skeleton loaders in content area if loading and no cached data
  const showSkeleton = isLoading && providers.length === 0 && !queryError && !userLoading;
  const shouldShowSearchBar = showSkeleton || (!queryError && emptyStateType !== 'no_saved_items');
  const shouldCenterWholePageContent = !showSkeleton && (!!queryError || emptyStateType === 'no_saved_items');

  // Render login-required state with PageLayout (matches login page design)
  if (emptyStateType === 'login_required') {
    return (
      <PageLayout hasBackground={false}>
        <PageContentWrapper centerVertically={true} contentClassName="gap-10">
          <TitleSection>
            <TitleAndText
              description={t('saved.loginDescription')}
              title={t('saved.loginRequired')}
            />
          </TitleSection>

          <div className="flex w-full flex-col">
            <ContentSection>
              {magicLinkSent ? (
                <div className="flex w-full flex-col gap-4">
                  <div className="rounded-lg bg-green-50 p-4 text-center">
                    <Icon className="mx-auto mb-2 h-8 w-8 text-green-600" icon="lucide:mail-check" />
                    <p className="text-sm font-medium text-green-800">
                      Magic Link gesendet!
                    </p>
                    <p className="mt-1 text-sm text-green-700">
                      Bitte überprüfe deine E-Mail und klicke auf den Link zum Anmelden.
                    </p>
                  </div>
                  <Button
                    fullWidth
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setMagicLinkSent(false);
                      setLoginFormData({ email: '', password: '' });
                    }}
                  >
                    Erneut versuchen
                  </Button>
                </div>
              ) : (
                <form className="flex w-full flex-col" onSubmit={handleLoginSubmit}>
                  <FormInputGroup gap="gap-3">
                    <FormInput
                      required
                      disabled={isLoginLoading}
                      label={t('login.emailLabel') || 'E-Mail'}
                      placeholder={t('login.emailPlaceholder') || 'Email eingeben'}
                      type="email"
                      value={loginFormData.email}
                      onChange={(e) => setLoginFormData({ ...loginFormData, email: e.target.value })}
                    />
                    {!useMagicLink && (
                      <FormInput
                        required
                        disabled={isLoginLoading}
                        label={t('login.passwordLabel') || 'Passwort'}
                        placeholder={t('login.passwordPlaceholder') || 'Passwort eingeben'}
                        rightIcon={showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        type={showPassword ? 'text' : 'password'}
                        value={loginFormData.password}
                        variant="with-icon"
                        onChange={(e) => setLoginFormData({ ...loginFormData, password: e.target.value })}
                        onRightIconClick={() => setShowPassword(!showPassword)}
                      />
                    )}
                  </FormInputGroup>

                  {loginError && (
                    <div className="mt-4">
                      {isEmailConfirmationError ? (
                        <EmailVerificationAlert
                          message={loginError}
                          onResend={handleResendConfirmation}
                        />
                      ) : (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <Icon className="h-5 w-5 text-danger" icon="lucide:alert-circle" />
                            </div>
                            <div className="ml-3 flex-1">
                              <p className="font-inter-tight text-sm leading-[19px] text-danger">
                                {loginError}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-6 flex flex-col space-y-3">
                    <Button
                      fullWidth
                      disabled={isLoginLoading}
                      loading={isLoginLoading}
                      loadingText={useMagicLink ? t('login.magicLinkLoading') : t('login.loading') || 'Anmeldung...'}
                      type="submit"
                      variant="auth"
                    >
                      {useMagicLink ? t('login.magicLinkButton') : t('login.submit') || 'Anmelden'}
                    </Button>
                    {useMagicLink && (
                      <>
                        <p className="text-center text-sm text-content">
                          {t('login.magicLinkDescription')}
                        </p>
                        <p className="text-center text-xs text-content-muted mt-2">
                          {t('legal.magicLinkConsent') || 'By continuing, you agree to our'}{' '}
                          <Link className="underline hover:text-primary" href="/terms">
                            {t('legal.termsOfService')}
                          </Link>
                          {' '}{t('legal.and')}{' '}
                          <Link className="underline hover:text-primary" href="/privacy-policy">
                            {t('legal.privacyPolicy')}
                          </Link>
                          .
                        </p>
                      </>
                    )}
                    {!useMagicLink && (
                      <div className="text-center">
                        <LinkButton
                          type="button"
                          onClick={() => router.push('/signup')}
                        >
                          {t('login.noAccount') || 'Noch kein Konto?'}
                        </LinkButton>
                      </div>
                    )}
                  </div>
                </form>
              )}
            </ContentSection>
          </div>
        </PageContentWrapper>
      </PageLayout>
    );
  }

  // Render authenticated states with ScrollablePageLayout
  return (
    <ScrollablePageLayout>
      <PageHeader 
        title={t('saved.title')}
        variant="title-only"
      />

      <PageContent 
        className={shouldCenterWholePageContent ? 'flex items-center justify-center min-h-[60vh]' : ''}
        maxWidth="full"
      >
        {shouldShowSearchBar && (
          <HomeSearchBar
            hideFilters
            activeSection={selectedSection}
            query={searchQuery}
            onQueryChange={setSearchQuery}
          />
        )}

        {showSkeleton ? (
          // Show skeleton grid while loading (only on true initial load with no cache)
          <div className="grid w-full grid-cols-2 gap-4 mt-6 mobile-nav-spacing">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        ) : queryError ? (
          <EmptyState
            description={t('saved.errorLoadingDescription') || 'Failed to load your saved items. Please try again.'}
            title={t('saved.errorLoading') || 'Error loading saved items'}
          />
        ) : emptyStateType === 'no_saved_items' ? (
          <EmptyState
            description={t('saved.noSavedProvidersDescription')}
            title={t('saved.noSavedProviders')}
          />
        ) : emptyStateType === 'no_results' ? (
          <div className="flex w-full min-h-[60vh] items-center justify-center">
            <EmptyState
              description={t('saved.noResultsDescription')}
              title={t('saved.noResults')}
            />
          </div>
        ) : (
          <ul 
            aria-label={t('saved.savedItemsList') || 'Saved items'}
            className="grid w-full grid-cols-2 gap-4 mt-6 mobile-nav-spacing"
            role="list"
          >
            {filteredProviders.map((provider) => {
              const isUmmah = provider.listing_type === 'ummah';
              const fallbackUrls = getAllTrustedImageUrlsWithFallback(
                provider.images,
                provider.category?.category_images
              );
              const imageUrl = fallbackUrls.length > 0 ? fallbackUrls[0] : PLACEHOLDER_IMAGE;
              const categoryUrls = parseCategoryImages(provider.category?.category_images ?? null);
              const isCategoryFallback = getFirstImageUrl(provider.images) === PLACEHOLDER_IMAGE && categoryUrls.length > 0;
              const categoryBgColor = isCategoryFallback
                ? getCategoryCardBackgroundColor(provider.category_id, provider.id)
                : undefined;
              const address = formatProviderAddress(provider.address_street, provider.address_city);
              
              return (
                <li key={provider.id}>
                  <SelectableCard
                    actionType="unsave"
                    backgroundColor={categoryBgColor}
                    bottomText={address}
                    category={provider.category?.name_de || ''}
                    imageUrl={imageUrl}
                    title={provider.name}
                    onAction={() => handleUnsave(provider.id, isUmmah)}
                    onClick={() => handleProviderClick(provider.id, isUmmah)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </PageContent>
    </ScrollablePageLayout>
  );
}
