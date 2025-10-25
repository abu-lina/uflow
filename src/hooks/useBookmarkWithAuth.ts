import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { useLanguage } from '@/hooks/useLanguage';
import { showLoginRequiredToast, showBookmarkSuccessToast, showBookmarkRemovedToast } from '@/utils/toastMessages';

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
  const { language } = useLanguage();
  const router = useRouter();

  const handleBookmarkAction = useCallback(async () => {
    if (!user) {
      // Show login required toast with action to redirect to login
      showLoginRequiredToast(language, () => {
        router.push('/login');
      });
      return;
    }

    // If user is authenticated, proceed with bookmark logic
    // This will be handled by the existing bookmark logic in components
    return true;
  }, [user, language, router]);

  const showBookmarkSuccess = useCallback(() => {
    showBookmarkSuccessToast(language);
  }, [language]);

  const showBookmarkRemoved = useCallback(() => {
    showBookmarkRemovedToast(language);
  }, [language]);

  return {
    handleBookmarkAction,
    showBookmarkSuccess,
    showBookmarkRemoved,
    isAuthenticated: !!user,
  };
};
