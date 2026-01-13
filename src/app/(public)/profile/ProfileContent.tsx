'use client';

import { useCallback, useEffect, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { CircleHelp, LogOut, User, Lock, FileText, AlertTriangle, Heart, Download, Shield, Eye, EyeOff, Scale } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { ErrorBoundary } from '@/components/common/error-boundary/ErrorBoundary';

// import clsx from 'clsx'; // Not used in mobile version

import { PageHeader } from '@/components/layout/PageHeader';
import { ScrollablePageLayout } from '@/components/layout/ScrollablePageLayout';
import { PageContent } from '@/components/layout/PageContent';
import { ContentSection } from '@/components/layout/ContentSection';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { FormInput } from '@/components/ui/FormInput';
import { BrokenHeartIcon } from '@/components/ui/BrokenHeartIcon';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconWithTitle } from '@/components/ui/IconWithTitle';
import { SelectableCard } from '@/components/shared/SelectableCard';
import { MobileAboutModal } from '@/components/shared/MobileAboutModal';
import { MobileProfileProviderCard } from '@/components/shared/MobileProfileProviderCard';
import { UserNavigationTabs, UserTab } from '@/components/shared/UserNavigationTabs';
import { ProviderCreateForm } from '@/features/providers/ProviderCreateForm';
import { useLanguage } from '@/providers/LanguageProvider';
import { useAuth } from '@/providers/auth-provider';
import { useIsSmallMobile } from '@/hooks/useIsMobile';
import { getCreatedProviders, getAllBookmarkedItems, getRecommendations } from '@/services/providers';
import { getCreatedCommunityServices, getRecommendedCommunityServices } from '@/services/communityServices';
import { authService } from '@/features/auth/services/authService';
import { getFirstImageUrl } from '@/utils/imageUtils';
import { dataExportService } from '@/services/dataExport';
import { toast } from 'sonner';
import type { SupabaseUser } from '@/types/supabase-user';

interface ProfileContentProps {
  user: SupabaseUser | null;
}

export function ProfileContent({ user }: ProfileContentProps) {
  const { user: clientUser, isLoading: loading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<UserTab>('saved');
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Form state for profile tab
  interface FormData {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<FormData | null>(null);

  // Responsive: detect mobile using the centralized hook
  const isMobile = useIsSmallMobile();

  // Helper function to get category name based on current language
  const getCategoryName = (category: { name_de?: string; name_en?: string } | undefined) => {
    if (!category) return '';
    if (language === 'en') {
      return category.name_en || category.name_de || '';
    } else {
      return category.name_de || category.name_en || '';
    }
  };

  // Helper function to get image URL for community services
  // Handles TEXT[] format from database (Supabase returns as array)
  const getCommunityServiceImageUrl = (communityService: { 
    community_service_images?: string[] | null | unknown;
    community_service_name?: string;
  }) => {
    // Handle null or undefined
    if (!communityService.community_service_images) {
      console.log('No community_service_images for:', communityService.community_service_name || 'unknown');
      return '/images/placeholder.jpg';
    }

    // Handle array format (TEXT[] from database)
    if (Array.isArray(communityService.community_service_images)) {
      const images = communityService.community_service_images;
      if (images.length === 0) {
        console.log('Empty images array for:', communityService.community_service_name || 'unknown');
        return '/images/placeholder.jpg';
      }
      // Get first image and validate it's a non-empty string
      const firstImage = images[0];
      if (firstImage && typeof firstImage === 'string' && firstImage.trim() !== '') {
        console.log('Found image URL:', firstImage, 'for:', communityService.community_service_name || 'unknown');
        return firstImage;
      }
      console.log('Invalid first image:', firstImage, 'for:', communityService.community_service_name || 'unknown');
    } else {
      // Log unexpected format
      console.log('Unexpected images format:', typeof communityService.community_service_images, communityService.community_service_images, 'for:', communityService.community_service_name || 'unknown');
    }

    // Fallback to placeholder
    return '/images/placeholder.jpg';
  };

  // Helper function to get provider image URL using the utility function
  const getProviderImageUrl = (provider: { provider_images?: string | null | { urls?: string[] } }) => {
    return getFirstImageUrl(provider.provider_images);
  };

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

  // Initialize form data from user when effectiveUser changes
  useEffect(() => {
    if (effectiveUser) {
      const fullName = effectiveUser.user_metadata?.full_name ?? '';
      const nameParts = fullName.split(' ');
      
      const initialData: FormData = {
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: effectiveUser.email || '',
        password: '',
      };
      
      setFormData(initialData);
      setOriginalData(initialData);
    }
  }, [effectiveUser]);


  // Use React Query for created providers with caching
  // Show cached data immediately while refetching in background
  const { data: createdProviders = [], isLoading: isLoadingCreated, error: createdError } = useQuery({
    queryKey: ['created-providers', effectiveUser?.id],
    queryFn: async () => {
      if (!effectiveUser) return [];
      const data = await getCreatedProviders(effectiveUser.id);
      return data ?? [];
    },
    enabled: !!effectiveUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
  });

  // Use React Query for saved providers with caching
  // Show cached data immediately while refetching in background
  const { data: savedProviders = [], isLoading: isLoadingSaved, error: savedError } = useQuery({
    queryKey: ['saved-providers', effectiveUser?.id],
    queryFn: async () => {
      if (!effectiveUser) return [];
      const data = await getAllBookmarkedItems(effectiveUser.id);
      return data ?? [];
    },
    enabled: !!effectiveUser,
    staleTime: 2 * 60 * 1000, // 2 minutes - smart caching
    placeholderData: (previousData) => previousData,
  });

  // Use React Query for recommendations with caching
  const { data: recommendations = [], isLoading: isLoadingRecommendations, error: recommendationsError } = useQuery({
    queryKey: ['recommendations', effectiveUser?.id],
    queryFn: async () => {
      if (!effectiveUser) return [];
      const data = await getRecommendations(effectiveUser.id);
      return data ?? [];
    },
    enabled: !!effectiveUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
  });

  // Use React Query for created community services with caching
  const { data: createdCommunityServices = [], isLoading: isLoadingCreatedCS, error: createdCSError } = useQuery({
    queryKey: ['created-community-services', effectiveUser?.id],
    queryFn: async () => {
      if (!effectiveUser) return [];
      const data = await getCreatedCommunityServices(effectiveUser.id);
      // Debug: Log the data structure to see what we're getting
      if (data && data.length > 0) {
        console.log('Created community services data:', data.map(cs => ({
          id: cs.community_service_id,
          name: cs.community_service_name,
          images: cs.community_service_images,
          imagesType: typeof cs.community_service_images,
          isArray: Array.isArray(cs.community_service_images),
        })));
      }
      return data ?? [];
    },
    enabled: !!effectiveUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
  });

  // Use React Query for recommended community services with caching
  const { data: recommendedCommunityServices = [], isLoading: isLoadingRecommendedCS, error: recommendedCSError } = useQuery({
    queryKey: ['recommended-community-services', effectiveUser?.id],
    queryFn: async () => {
      if (!effectiveUser) return [];
      const data = await getRecommendedCommunityServices(effectiveUser.id);
      return data ?? [];
    },
    enabled: !!effectiveUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
  });

  const isLoadingProviders = isLoadingCreated || isLoadingSaved || isLoadingRecommendations || isLoadingCreatedCS || isLoadingRecommendedCS;
  const error = createdError || savedError || recommendationsError || createdCSError || recommendedCSError ? t('providers.errorLoading') : null;

  // Handle removal from saved list (optimistic update)
  const handleRemoveFromSaved = useCallback((removedId: string) => {
    queryClient.setQueryData(['saved-providers', effectiveUser?.id], (old: unknown[] = []) => {
      return old.filter((item: unknown) => {
        const searchResult = item as { id?: string };
        return searchResult.id !== removedId;
      });
    });
  }, [queryClient, effectiveUser?.id]);


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

  // Handle data export
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      await dataExportService.exportUserData();
      toast.success(t('legal.downloadData') || 'Data export started');
    } catch (error) {
      console.error('Export error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to export data';
      toast.error(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  // Show loading while auth is being checked
  if (loading) {
    return (
      <ScrollablePageLayout>
        <PageContent className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner text={t('common.loading')} />
        </PageContent>
      </ScrollablePageLayout>
    );
  }

  // Show authentication required if no user
  if (!effectiveUser) {
    return (
      <ScrollablePageLayout>
        <PageContent className="flex items-center justify-center min-h-[60vh]">
          <IconWithTitle
            icon={<Lock className="h-16 w-16 text-primary" />}
            title={t('saved.loginRequired')}
          />
        </PageContent>
      </ScrollablePageLayout>
    );
  }

  const fullName = effectiveUser.user_metadata?.full_name ?? effectiveUser.email ?? 'Unknown User';

  // Form handlers
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Check if form has changes
  const hasChanges = () => {
    if (!originalData) return false;
    
    return (
      formData.firstName !== originalData.firstName ||
      formData.lastName !== originalData.lastName ||
      formData.email !== originalData.email ||
      formData.password.trim() !== ''
    );
  };

  const submitProfileForm = async () => {
    setIsSubmitting(true);
    setProfileError(null);
    setIsSaved(false);

    try {
      // Update user metadata if name changed
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const currentFullName = effectiveUser?.user_metadata?.full_name ?? '';
      
      if (fullName !== currentFullName) {
        await authService.updateUser({
          data: {
            full_name: fullName,
          },
        });
      }

      // Update email if changed
      if (formData.email !== effectiveUser?.email) {
        await authService.updateUser({
          email: formData.email,
        });
      }

      // Update password if provided
      if (formData.password.trim()) {
        await authService.updateUser({
          password: formData.password,
        });
      }

      // Show success state
      setIsSaved(true);
      
      // Update original data to current form data (excluding password)
      setOriginalData({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: '',
      });
      
      // Clear password field after successful save
      setFormData(prev => ({ ...prev, password: '' }));
      
      // Refresh user data
      queryClient.invalidateQueries({ queryKey: ['user'] });
      
    } catch (err) {
      console.error('Error updating profile:', err);
      setProfileError(t('profile.errorUpdatingProfile'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseAccount = () => {
    router.push('/profile/delete');
  };

  // Mobile content - using proper layout components
  const mobileContent = (
    <ScrollablePageLayout>
      <PageHeader 
        title={t('navigation.profile')}
        variant="title-only"
      />

      <PageContent 
        className="mobile-nav-spacing md:pb-8"
        maxWidth="full"
      >
        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4">
            <p className="text-center text-red-600">{t('providers.errorLoading')}</p>
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
                <div className="h-16 w-16 flex-shrink-0 flex items-center justify-center rounded-full bg-primary p-1">
                  <User className="h-10 w-10 text-white" />
                </div>
                
                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-inter-tight text-lg font-semibold text-content-heading truncate" title={fullName}>
                    {fullName}
                  </div>
                  <div className="font-inter text-sm text-content-muted truncate" title={effectiveUser.email}>
                    {effectiveUser.email}
                  </div>
                </div>
              </div>
            </button>
          </div>
        </ContentSection>

        {/* Deine Inhalte Section */}
        <ContentSection className="mt-4">
          <div>
            <SectionHeading>
              {t('profile.yourContent')}
            </SectionHeading>
            
            {/* Only show loading on true initial load - isLoading is true only when no cached data */}
            {isLoadingProviders ? (
              <LoadingSpinner text={t('providers.loadingProviders')} />
            ) : createdProviders.length > 0 || createdCommunityServices.length > 0 ? (
              <div className="space-y-3">
                {createdProviders.map((provider) => (
                  <MobileProfileProviderCard
                    key={provider.provider_id}
                    category={getCategoryName(provider.category) || t('search.unnamed')}
                    imageUrl={getProviderImageUrl(provider)}
                    likes={provider.bookmark_count || 0}
                    savedText={t('actions.saved')}
                    title={provider.provider_name}
                    onClick={() => router.push(`/profile/providers/${provider.provider_id}`)}
                  />
                ))}
                {createdCommunityServices.map((communityService) => (
                  <MobileProfileProviderCard
                    key={communityService.community_service_id}
                    category={getCategoryName(communityService.category) || t('search.unnamed')}
                    imageUrl={getCommunityServiceImageUrl(communityService)}
                    likes={0}
                    savedText={t('actions.saved')}
                    title={communityService.community_service_name}
                    onClick={() => router.push(`/community-services/${communityService.community_service_id}`)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                description={t('providers.noResultsDescription')}
                icon={<FileText className="h-16 w-16 text-gray-400" />}
                title={t('providers.noResultsFound')}
              />
            )}
          </div>
        </ContentSection>

        {/* Recommendations Section */}
        <ContentSection className="mt-4">
          <div>
            <SectionHeading>
              {t('profile.recommendations')}
            </SectionHeading>
            
            {/* Only show loading on true initial load - isLoading is true only when no cached data */}
            {isLoadingRecommendations || isLoadingRecommendedCS ? (
              <LoadingSpinner text={t('providers.loadingProviders')} />
            ) : recommendations.length > 0 || recommendedCommunityServices.length > 0 ? (
              <div className="space-y-3">
                {recommendations.map((provider) => (
                  <MobileProfileProviderCard
                    key={provider.provider_id}
                    category={getCategoryName(provider.category) || t('search.unnamed')}
                    imageUrl={getProviderImageUrl(provider)}
                    likes={provider.bookmark_count || 0}
                    savedText={t('actions.saved')}
                    title={provider.provider_name}
                    onClick={() => router.push(`/profile/providers/${provider.provider_id}/edit`)}
                  />
                ))}
                {recommendedCommunityServices.map((communityService) => (
                  <MobileProfileProviderCard
                    key={communityService.community_service_id}
                    category={getCategoryName(communityService.category) || t('search.unnamed')}
                    imageUrl={getCommunityServiceImageUrl(communityService)}
                    likes={0}
                    savedText={t('actions.saved')}
                    title={communityService.community_service_name}
                    onClick={() => router.push(`/community-services/${communityService.community_service_id}`)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                description={t('providers.noRecommendationsDescription')}
                icon={<FileText className="h-16 w-16 text-gray-400" />}
                title={t('providers.noRecommendations')}
              />
            )}
          </div>
        </ContentSection>

        {/* Action Items */}
        <ContentSection className="mt-4 mb-8 md:mb-6">
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
                <span className="font-inter-tight font-semibold text-content-heading">{t('navigation.about')}</span>
              </button>
              
              {/* Divider */}
              <div className="mx-4 h-px bg-gray-200" />

              {/* Support */}
              <button className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-gray-50">
                <CircleHelp className="h-6 w-6 text-black" />
                <span className="font-inter-tight font-semibold text-content-heading">{t('common.support') || 'Support'}</span>
              </button>
              
              {/* Divider */}
              <div className="mx-4 h-px bg-gray-200" />

              {/* Privacy Policy */}
              <Link
                className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-gray-50"
                href="/privacy-policy"
              >
                <Shield className="h-6 w-6 text-black" />
                <span className="font-inter-tight font-semibold text-content-heading">
                  {t('legal.privacyPolicy') || 'Privacy Policy'}
                </span>
              </Link>
              
              {/* Divider */}
              <div className="mx-4 h-px bg-gray-200" />

              {/* Terms of Service */}
              <Link
                className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-gray-50"
                href="/terms"
              >
                <FileText className="h-6 w-6 text-black" />
                <span className="font-inter-tight font-semibold text-content-heading">
                  {t('legal.termsOfService') || 'Terms of Service'}
                </span>
              </Link>
              
              {/* Divider */}
              <div className="mx-4 h-px bg-gray-200" />

              {/* Impressum */}
              <Link
                className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-gray-50"
                href="/impressum"
              >
                <Scale className="h-6 w-6 text-black" />
                <span className="font-inter-tight font-semibold text-content-heading">
                  {t('legal.impressum') || 'Impressum'}
                </span>
              </Link>
              
              {/* Divider */}
              <div className="mx-4 h-px bg-gray-200" />

              {/* Download My Data */}
              <button
                className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-gray-50 disabled:opacity-50"
                disabled={isExporting}
                onClick={handleExportData}
              >
                <Download className="h-6 w-6 text-black" />
                <span className="font-inter-tight font-semibold text-content-heading">
                  {isExporting ? t('common.loading') + '...' : t('legal.downloadData') || 'Download My Data'}
                </span>
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
                <span className="font-inter-tight font-semibold text-content-heading">
                  {isLoggingOut ? t('auth.logout') + '...' : t('auth.logout')}
                </span>
              </button>
            </div>
          </div>
        </ContentSection>
      </PageContent>
    </ScrollablePageLayout>
  );

  // Desktop: tabbed view
  const desktopContent = (
    <div className="flex min-h-full w-full flex-col items-center gap-8 sm:max-w-screen-xl sm:mx-auto md:pt-28 md:pb-8">
      {/* Profile header (greeting, avatar, etc.) */}
      <div className="flex w-full flex-col items-center">
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
          title={t('providers.errorTitle')}
        >
          <p className="text-center text-red-600 mb-4">{error}</p>
          <button
            className="w-full rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition-colors"
            onClick={() => window.location.reload()}
          >
            {t('common.retry')}
          </button>
        </IconWithTitle>
      )}

      <UserNavigationTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="mt-6 w-full">
        {activeTab === 'created' && (
          <div className="flex flex-wrap justify-center gap-8">
            {/* Only show loading on true initial load - isLoading is true only when no cached data */}
            {isLoadingProviders ? (
              <LoadingSpinner text={t('providers.loadingProviders')} />
            ) : createdProviders.length > 0 || createdCommunityServices.length > 0 ? (
              <>
                {createdProviders.map((provider) => {
                  const address = provider.address_street && provider.address_city
                    ? `${provider.address_street}, ${provider.address_city}`
                    : provider.address_street || provider.address_city || undefined;
                  
                  return (
                    <SelectableCard
                      key={provider.provider_id}
                      bottomText={address}
                      category={getCategoryName(provider.category)}
                      imageUrl={getProviderImageUrl(provider)}
                      title={provider.provider_name}
                    />
                  );
                })}
                {createdCommunityServices.map((communityService) => {
                  const address = communityService.address_street && communityService.address_city
                    ? `${communityService.address_street}, ${communityService.address_city}`
                    : communityService.address_street || communityService.address_city || undefined;
                  
                  return (
                    <SelectableCard
                      key={communityService.community_service_id}
                      bottomText={address}
                      category={getCategoryName(communityService.category)}
                      imageUrl={getCommunityServiceImageUrl(communityService)}
                      title={communityService.community_service_name}
                      onClick={() => router.push(`/community-services/${communityService.community_service_id}`)}
                    />
                  );
                })}
              </>
            ) : (
              <EmptyState
                description={t('providers.createFirstProviderDescription')}
                icon={<FileText className="h-16 w-16 text-gray-400" />}
                title={t('providers.noProvidersCreated')}
              />
            )}
          </div>
        )}
        {activeTab === 'saved' && (
          <div className="flex flex-wrap justify-center gap-8">
            {/* Only show loading on true initial load - isLoading is true only when no cached data */}
            {isLoadingProviders ? (
              <LoadingSpinner text={t('providers.loadingProviders')} />
            ) : savedProviders.length > 0 ? (
              savedProviders.map((provider) => {
                const address = provider.address_street && provider.address_city
                  ? `${provider.address_street}, ${provider.address_city}`
                  : provider.address_street || provider.address_city || undefined;
                
                return (
                  <SelectableCard
                    key={provider.id}
                    bookmarkableId={provider.id}
                    bookmarkableType={provider.type}
                    bottomText={address}
                    category={getCategoryName(provider.category)}
                    imageUrl={getFirstImageUrl(provider.images)}
                    title={provider.name}
                    onClick={() => {
                      if (provider.type === 'community_service') {
                        router.push(`/community-services/${provider.id}`);
                      } else {
                        router.push(`/providers/${provider.id}`);
                      }
                    }}
                    onRemove={() => handleRemoveFromSaved(provider.id)}
                  />
                );
              })
            ) : (
              <EmptyState
                description={t('providers.saveProvidersDescription')}
                icon={<Heart className="h-16 w-16 text-gray-400" />}
                title={t('providers.noProvidersSaved')}
              />
            )}
          </div>
        )}
        {activeTab === 'recommendations' && (
          <div className="flex flex-wrap justify-center gap-8">
            {/* Only show loading on true initial load - isLoading is true only when no cached data */}
            {isLoadingRecommendations || isLoadingRecommendedCS ? (
              <LoadingSpinner text={t('providers.loadingProviders')} />
            ) : recommendations.length > 0 || recommendedCommunityServices.length > 0 ? (
              <>
                {recommendations.map((provider) => {
                  const address = provider.address_street && provider.address_city
                    ? `${provider.address_street}, ${provider.address_city}`
                    : provider.address_street || provider.address_city || undefined;
                  
                  return (
                    <SelectableCard
                      key={provider.provider_id}
                      bottomText={address}
                      category={getCategoryName(provider.category)}
                      imageUrl={getProviderImageUrl(provider)}
                      title={provider.provider_name}
                      onClick={() => router.push(`/profile/providers/${provider.provider_id}/edit`)}
                    />
                  );
                })}
                {recommendedCommunityServices.map((communityService) => {
                  const address = communityService.address_street && communityService.address_city
                    ? `${communityService.address_street}, ${communityService.address_city}`
                    : communityService.address_street || communityService.address_city || undefined;
                  
                  return (
                    <SelectableCard
                      key={communityService.community_service_id}
                      bottomText={address}
                      category={getCategoryName(communityService.category)}
                      imageUrl={getCommunityServiceImageUrl(communityService)}
                      title={communityService.community_service_name}
                      onClick={() => router.push(`/community-services/${communityService.community_service_id}`)}
                    />
                  );
                })}
              </>
            ) : (
              <EmptyState
                description={t('providers.noRecommendationsDescription')}
                icon={<FileText className="h-16 w-16 text-gray-400" />}
                title={t('providers.noRecommendations')}
              />
            )}
          </div>
        )}
        {activeTab === 'create' && (
          <div className="flex flex-col items-center">
            <ProviderCreateForm />
          </div>
        )}
        {activeTab === 'profile' && (
          <div className="flex justify-center w-full">
            <div className="w-full" style={{ maxWidth: '640px' }}>
              {/* Error Message */}
              {profileError && (
                <div className="mb-4 rounded-lg bg-red-50 p-4">
                  <p className="text-center text-red-600">{profileError}</p>
                </div>
              )}

              {/* Personal Data Section */}
              <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); submitProfileForm(); }}>
                <SectionHeading>
                  {t('profile.personalData')}
                </SectionHeading>
              
                <div className="space-y-3">
                  {/* First Name */}
                  <FormInput
                    required
                    label={t('profile.firstName')}
                    labelClassName="h-[15px] w-full font-inter-tight text-xs font-normal leading-[15px]"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                  />

                  {/* Last Name */}
                  <FormInput
                    required
                    label={t('profile.lastName')}
                    labelClassName="h-[15px] w-full font-inter-tight text-xs font-normal leading-[15px]"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                  />

                  {/* Email */}
                  <FormInput
                    required
                    label={t('profile.email')}
                    labelClassName="h-[15px] w-full font-inter-tight text-xs font-normal leading-[15px]"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />

                  {/* Password Field with Hint */}
                  <div className="space-y-1">
                    <FormInput
                      label={t('profile.password')}
                      labelClassName="h-[15px] w-full font-inter-tight text-xs font-normal leading-[15px]"
                      rightIcon={showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      variant="with-icon"
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      onRightIconClick={() => setShowPassword(!showPassword)}
                    />
                    <p className="pl-2 text-xs text-gray-500">
                      {t('profile.passwordHint')}
                    </p>
                  </div>
                </div>
              </form>

              {/* Manage Account Section */}
              <ContentSection className="mt-8 mb-6">
                <div>
                  <SectionHeading>
                    {t('profile.manageAccount')}
                  </SectionHeading>
                
                  <button
                    className="flex h-[54px] w-full items-center gap-3 rounded-xl border border-[#D4D4D4] bg-white px-4"
                    onClick={handleCloseAccount}
                  >
                    <BrokenHeartIcon size={24} />
                    <span className="font-inter-tight text-base font-semibold text-content-heading">
                      {t('profile.closeAccount')}
                    </span>
                  </button>
                </div>
              </ContentSection>

              {/* Save Button */}
              <div className="mt-6 flex justify-center w-full">
                <button
                  className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 transition-colors ${
                    isSaved 
                      ? 'bg-green-500 text-white' 
                      : hasChanges() 
                        ? 'bg-primary text-white hover:bg-primary/90' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  disabled={isSaved || isSubmitting || !hasChanges()}
                  onClick={submitProfileForm}
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span className="font-inter-tight text-base font-medium text-white">
                        {t('actions.saving')}
                      </span>
                    </>
                  ) : isSaved ? (
                    <>
                      <Icon className="h-5 w-5 text-white" icon="lucide:check" />
                      <span className="font-inter-tight text-base font-medium text-white">
                        {t('actions.saved')}
                      </span>
                    </>
                  ) : (
                    <>
                      <Icon 
                        className={`h-5 w-5 ${hasChanges() ? 'text-white' : 'text-gray-500'}`} 
                        icon={hasChanges() ? 'lucide:save' : 'lucide:file-text'}
                      />
                      <span className={`font-inter-tight text-base font-medium ${hasChanges() ? 'text-white' : 'text-gray-500'}`}>
                        {hasChanges() ? t('actions.saveChanges') : t('actions.noChanges')}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
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
