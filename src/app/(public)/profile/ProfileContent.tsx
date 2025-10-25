'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { CircleHelp, LogOut, User, Lock, FileText, AlertTriangle, Heart } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { ErrorBoundary } from '@/components/common/error-boundary/ErrorBoundary';

// import clsx from 'clsx'; // Not used in mobile version

import { PageHeader } from '@/components/layout/PageHeader';
import { HeaderSpacer } from '@/components/layout/HeaderSpacer';
import { PageLayout } from '@/components/layout/PageLayout';
import { PageContentWrapper } from '@/components/layout/PageContentWrapper';
import { ContentSection } from '@/components/layout/ContentSection';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconWithTitle } from '@/components/ui/IconWithTitle';
import { SelectableCard } from '@/components/shared/SelectableCard';
import { MobileAboutModal } from '@/components/shared/MobileAboutModal';
import { MobileProfileProviderCard } from '@/components/shared/MobileProfileProviderCard';
import { UserNavigationTabs, UserTab } from '@/components/shared/UserNavigationTabs';
import { ProviderCreateForm } from '@/features/providers/ProviderCreateForm';
import { useAuth } from '@/hooks/useAuth';
import { useContainerScroll } from '@/hooks/useContainerScroll';
import { useIsSmallMobile } from '@/hooks/useIsMobile';
import { getCreatedProviders, getAllBookmarkedItems } from '@/services/providers';
import { authService } from '@/features/auth/services/authService';
import type { SupabaseUser } from '@/types/supabase-user';

interface ProfileContentProps {
  user: SupabaseUser | null;
}

export function ProfileContent({ user }: ProfileContentProps) {
  const { user: clientUser, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<UserTab>('created');
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { isHeaderVisible } = useContainerScroll();

  // Responsive: detect mobile using the centralized hook
  const isMobile = useIsSmallMobile();

  // Use client-side user if server-side user is null
  const effectiveUser: SupabaseUser | null = user || (clientUser as SupabaseUser | null);

  // Handle authentication state
  useEffect(() => {
    if (!loading && !effectiveUser) {
      // No user found on either server or client side
      router.replace('/login');
    }
  }, [effectiveUser, loading, router]);

  // Event-driven cache invalidation for bookmark changes
  useEffect(() => {
    const handleBookmarkChange = () => {
      if (effectiveUser) {
        queryClient.invalidateQueries({ queryKey: ['saved-providers', effectiveUser.id] });
        queryClient.invalidateQueries({ queryKey: ['bookmarks', effectiveUser.id] });
      }
    };

    // Listen for bookmark change events
    window.addEventListener('bookmark-changed', handleBookmarkChange);
    return () => window.removeEventListener('bookmark-changed', handleBookmarkChange);
  }, [effectiveUser, queryClient]);

  // Use React Query for created providers with caching
  const { data: createdProviders = [], isLoading: isLoadingCreated, error: createdError } = useQuery({
    queryKey: ['created-providers', effectiveUser?.id],
    queryFn: async () => {
      if (!effectiveUser) return [];
      const data = await getCreatedProviders(effectiveUser.id);
      return data ?? [];
    },
    enabled: !!effectiveUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use React Query for saved providers with caching
  const { data: savedProviders = [], isLoading: isLoadingSaved, error: savedError } = useQuery({
    queryKey: ['saved-providers', effectiveUser?.id],
    queryFn: async () => {
      if (!effectiveUser) return [];
      const data = await getAllBookmarkedItems(effectiveUser.id);
      return data ?? [];
    },
    enabled: !!effectiveUser,
    staleTime: 2 * 60 * 1000, // 2 minutes - smart caching
  });

  const isLoadingProviders = isLoadingCreated || isLoadingSaved;
  const error = createdError || savedError ? 'Fehler beim Laden der Providers' : null;

  // Handle logout
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authService.signOut();
      router.push('/?auth=required');
    } catch (error) {
      console.error('Error during logout:', error);
      // Logout error is already logged to console
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Show loading while auth is being checked
  if (loading) {
    return (
      <PageLayout hasBackground={false}>
        <PageContentWrapper centerVertically={true}>
          <LoadingSpinner text="Überprüfe Anmeldung..." />
        </PageContentWrapper>
      </PageLayout>
    );
  }

  // Show authentication required if no user
  if (!effectiveUser) {
    return (
      <PageLayout hasBackground={false}>
        <PageContentWrapper centerVertically={true}>
          <IconWithTitle
            icon={<Lock className="h-16 w-16 text-[#589D96]" />}
            title="Anmeldung erforderlich"
          />
        </PageContentWrapper>
      </PageLayout>
    );
  }

  const fullName = effectiveUser.user_metadata?.full_name ?? effectiveUser.email ?? 'Unknown User';

  // Mobile content - using proper layout components
  const mobileContent = (
    <PageLayout hasBackground={false}>
      <PageHeader 
        isVisible={isHeaderVisible}
        title="Profil"
      />

      <HeaderSpacer isVisible={isHeaderVisible} />

      <PageContentWrapper includeMobileNavSpacing={true}>
        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4">
            <p className="text-center text-red-600">{error}</p>
          </div>
        )}

        {/* User Info Card */}
        <ContentSection>
          <div>
            <button
              className="w-full rounded-lg bg-white p-4 text-left transition-colors hover:bg-gray-50"
              onClick={() => router.push('/profile/edit')}
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="h-16 w-16 flex-shrink-0 flex items-center justify-center rounded-full bg-[#589D96] p-1">
                  <User className="h-10 w-10 text-white" />
                </div>
                
                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-inter-tight text-lg font-semibold text-[#232323] truncate" title={fullName}>
                    {fullName}
                  </div>
                  <div className="font-inter text-sm text-[#555] truncate" title={effectiveUser.email}>
                    {effectiveUser.email}
                  </div>
                </div>
              </div>
            </button>
          </div>
        </ContentSection>

        {/* Deine Inhalte Section */}
        <ContentSection className="mt-6">
          <div>
            <SectionHeading>
              Deine Inhalte
            </SectionHeading>
            
            {isLoadingProviders ? (
              <LoadingSpinner text="Lade Providers..." />
            ) : createdProviders.length > 0 ? (
              <div className="space-y-3">
                {createdProviders.map((provider) => (
                  <MobileProfileProviderCard
                    key={provider.provider_id}
                    category={provider.category?.name_de || 'Unbekannt'}
                    imageUrl={(() => {
                      if (!provider.provider_images) return '/images/placeholder.jpg';
                      try {
                        let imagesData: { urls?: string[] } = {};
                        if (typeof provider.provider_images === 'string') {
                          imagesData = JSON.parse(provider.provider_images);
                        } else if (Array.isArray(provider.provider_images)) {
                          imagesData.urls = provider.provider_images;
                        } else if (
                          typeof provider.provider_images === 'object' &&
                          provider.provider_images !== null &&
                          'urls' in provider.provider_images
                        ) {
                          imagesData = provider.provider_images;
                        }
                        if (imagesData.urls && imagesData.urls.length > 0) {
                          return imagesData.urls[0];
                        }
                      } catch {
                        return '/images/placeholder.jpg';
                      }
                      return '/images/placeholder.jpg';
                    })()}
                    likes={provider.bookmark_count || 0}
                    title={provider.provider_name}
                    onClick={() => router.push(`/profile/providers/${provider.provider_id}`)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                description="Erstelle deinen ersten Provider um loszulegen"
                icon={<FileText className="h-16 w-16 text-gray-400" />}
                title="Keine Providers erstellt"
              />
            )}
          </div>
        </ContentSection>

        {/* Action Items */}
        <ContentSection className="mt-8 mb-6">
          <div>
            <div className="rounded-lg bg-white">
              {/* Über Uns */}
              <button
                className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-gray-50"
                onClick={() => router.push('/about')}
              >
                <Image
                  alt="UFlow Logo"
                  className="h-6 w-6 rounded-full"
                  height={24}
                  src="/icons/icon-192x192.png"
                  width={24}
                />
                <span className="font-inter-tight font-semibold text-[#232323]">Über Uns</span>
              </button>
              
              {/* Divider */}
              <div className="mx-4 h-px bg-gray-200" />

              {/* Support */}
              <button className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-gray-50">
                <CircleHelp className="h-6 w-6 text-black" />
                <span className="font-inter-tight font-semibold text-[#232323]">Support</span>
              </button>
              
              {/* Divider */}
              <div className="mx-4 h-px bg-gray-200" />

              {/* Abmelden */}
              <button
                className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-gray-50 disabled:opacity-50"
                disabled={isLoggingOut}
                onClick={handleLogout}
              >
                <LogOut className="h-6 w-6 text-black" />
                <span className="font-inter-tight font-semibold text-[#232323]">
                  {isLoggingOut ? 'Melde ab...' : 'Abmelden'}
                </span>
              </button>
            </div>
          </div>
        </ContentSection>
      </PageContentWrapper>
    </PageLayout>
  );

  // Desktop: tabbed view
  const desktopContent = (
    <div className="flex min-h-full w-full flex-col items-center gap-8 sm:max-w-screen-xl md:pt-20">
      {/* Profile header (greeting, avatar, etc.) */}
      <div className="flex w-full flex-col items-center">
        <div className="text-center font-baskerville text-base">As-Salamu-Aleikum</div>
        <div className="flex w-full flex-row items-center justify-center">
            <div className="flex h-[80px] w-[80px] items-center justify-center rounded-full bg-primary p-4">
              <User className="h-10 w-10 text-white" />
            </div>
          <div className="ml-6 flex flex-col items-start justify-center">
            <div className="text-text-primary font-inter-tight text-3xl font-semibold">
              {fullName}
            </div>
            <div className="text-text-secondary font-inter text-base">{effectiveUser.email}</div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <IconWithTitle
          className="w-full rounded-lg bg-red-50 p-6"
          icon={<AlertTriangle className="h-16 w-16 text-red-500" />}
          title="Fehler beim Laden"
        >
          <p className="text-center text-red-600 mb-4">{error}</p>
          <button
            className="w-full rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition-colors"
            onClick={() => window.location.reload()}
          >
            Erneut versuchen
          </button>
        </IconWithTitle>
      )}

      <UserNavigationTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="mt-6 w-full">
        {activeTab === 'created' && (
          <div className="flex flex-wrap justify-center gap-8">
            {isLoadingProviders ? (
              <LoadingSpinner text="Lade Providers..." />
            ) : createdProviders.length > 0 ? (
              createdProviders.map((provider) => {
                const address = provider.address_street && provider.address_city
                  ? `${provider.address_street}, ${provider.address_city}`
                  : provider.address_street || provider.address_city || undefined;
                
                const getImageUrl = () => {
                  if (!provider.provider_images) return '/images/placeholder.jpg';
                  try {
                    let imagesData: { urls?: string[] } = {};
                    if (typeof provider.provider_images === 'string') {
                      imagesData = JSON.parse(provider.provider_images);
                    } else if (Array.isArray(provider.provider_images)) {
                      imagesData.urls = provider.provider_images;
                    } else if (
                      typeof provider.provider_images === 'object' &&
                      provider.provider_images !== null &&
                      'urls' in provider.provider_images
                    ) {
                      imagesData = provider.provider_images;
                    }
                    if (imagesData.urls && imagesData.urls.length > 0) {
                      return imagesData.urls[0];
                    }
                  } catch {
                    return '/images/placeholder.jpg';
                  }
                  return '/images/placeholder.jpg';
                };
                
                return (
                  <SelectableCard
                    key={provider.provider_id}
                    bottomText={address}
                    category={provider.category?.name_de || ''}
                    imageUrl={getImageUrl()}
                    title={provider.provider_name}
                  />
                );
              })
            ) : (
              <EmptyState
                description="Erstelle deinen ersten Provider um loszulegen"
                icon={<FileText className="h-16 w-16 text-gray-400" />}
                title="Keine Providers erstellt"
              />
            )}
          </div>
        )}
        {activeTab === 'saved' && (
          <div className="flex flex-wrap justify-center gap-8">
            {isLoadingProviders ? (
              <LoadingSpinner text="Lade Providers..." />
            ) : savedProviders.length > 0 ? (
              savedProviders.map((provider) => {
                const address = provider.address_street && provider.address_city
                  ? `${provider.address_street}, ${provider.address_city}`
                  : provider.address_street || provider.address_city || undefined;
                
                const getImageUrl = () => {
                  if (!provider.provider_images) return '/images/placeholder.jpg';
                  try {
                    let imagesData: { urls?: string[] } = {};
                    if (typeof provider.provider_images === 'string') {
                      imagesData = JSON.parse(provider.provider_images);
                    } else if (Array.isArray(provider.provider_images)) {
                      imagesData.urls = provider.provider_images;
                    } else if (
                      typeof provider.provider_images === 'object' &&
                      provider.provider_images !== null &&
                      'urls' in provider.provider_images
                    ) {
                      imagesData = provider.provider_images;
                    }
                    if (imagesData.urls && imagesData.urls.length > 0) {
                      return imagesData.urls[0];
                    }
                  } catch {
                    return '/images/placeholder.jpg';
                  }
                  return '/images/placeholder.jpg';
                };
                
                return (
                  <SelectableCard
                    key={provider.provider_id}
                    bottomText={address}
                    category={provider.category?.name_de || ''}
                    imageUrl={getImageUrl()}
                    title={provider.provider_name}
                  />
                );
              })
            ) : (
              <EmptyState
                description="Speichere interessante Providers für später"
                icon={<Heart className="h-16 w-16 text-gray-400" />}
                title="Keine Providers gespeichert"
              />
            )}
          </div>
        )}
        {activeTab === 'create' && (
          <div className="flex flex-col items-center">
            <ProviderCreateForm />
          </div>
        )}
      </div>
    </div>
  );

  // Return content with modal
  return (
    <ErrorBoundary>
      {isMobile ? mobileContent : desktopContent}
      <MobileAboutModal isOpen={showAboutModal} onClose={() => setShowAboutModal(false)} />
    </ErrorBoundary>
  );
}
