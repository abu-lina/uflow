import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/providers/auth-provider';
import { useLanguage } from '@/providers/LanguageProvider';

interface UseBookmarkWithAuthOptions {
  bookmarkableId: string;
  bookmarkableType: 'provider' | 'community_service';
  onBookmarkChange?: (isBookmarked: boolean) => void;
}

export const useBookmarkWithAuth = ({
  bookmarkableId: _bookmarkableId,
  bookmarkableType: _bookmarkableType,
  onBookmarkChange: _onBookmarkChange,
}: UseBookmarkWithAuthOptions) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const handleBookmarkAction = useCallback(async () => {
    if (!user) {
      // Redirect to bookmark menu (saved page) when not authenticated
      router.push('/saved');
      return;
    }

    // If user is authenticated, proceed with bookmark logic
    // This will be handled by the existing bookmark logic in components
    return true;
  }, [user, router]);

  const showBookmarkSuccess = useCallback(() => {
    toast.success(t('providers.saved'));
  }, [t]);

  const showBookmarkRemoved = useCallback(() => {
    toast.info(t('providers.removeSaved'));
  }, [t]);

  return {
    handleBookmarkAction,
    showBookmarkSuccess,
    showBookmarkRemoved,
    isAuthenticated: !!user,
  };
};
