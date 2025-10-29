import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/providers/auth-provider';
import { getAllBookmarkedItems } from '@/services/providers';

interface UseOptimisticBookmarkOptions {
  bookmarkableId: string;
  bookmarkableType: 'provider' | 'community_service';
  onBookmarkChange?: (isBookmarked: boolean) => void;
}

export function useOptimisticBookmark({
  bookmarkableId,
  bookmarkableType,
  onBookmarkChange,
}: UseOptimisticBookmarkOptions) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  // Toast notifications removed - no longer needed

  const handleBookmark = useCallback(async () => {
    if (!user) return;

    // Get current bookmarks to determine if we're adding or removing
    const currentBookmarks = queryClient.getQueryData<string[]>(['bookmarks', user.id]) || [];
    const isCurrentlyBookmarked = currentBookmarks.includes(bookmarkableId);
    const newBookmarkState = !isCurrentlyBookmarked;

    // 1. Optimistic update for bookmarks list
    queryClient.setQueryData(['bookmarks', user.id], (old: string[] = []) => {
      if (newBookmarkState) {
        return [...old, bookmarkableId];
      } else {
        return old.filter(id => id !== bookmarkableId);
      }
    });

    // 2. Optimistic update for saved providers list
    if (!newBookmarkState) {
      // Remove from saved providers list
      queryClient.setQueryData(['saved-providers', user.id], (old: unknown[] = []) => {
        return old.filter((item: unknown) => {
          const provider = item as { id?: string };
          return provider.id !== bookmarkableId;
        });
      });
    }

    // 3. Call the callback for immediate UI feedback
    onBookmarkChange?.(newBookmarkState);

    // 4. Toast notifications removed

    try {
      // 5. Server sync
      const { data: existingBookmark, error: fetchError } = await supabase
        .from('bookmarks')
        .select('id')
        .match({
          bookmarkable_id: bookmarkableId,
          bookmarkable_type: bookmarkableType,
          user_id: user.id,
        })
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingBookmark) {
        // Remove bookmark
        const { error: deleteError } = await supabase
          .from('bookmarks')
          .delete()
          .eq('id', existingBookmark.id);
        if (deleteError) throw deleteError;
      } else {
        // Add bookmark
        const { error: insertError } = await supabase.from('bookmarks').insert({
          bookmarkable_id: bookmarkableId,
          bookmarkable_type: bookmarkableType,
          user_id: user.id,
        });
        if (insertError) throw insertError;
      }

      // 6. Dispatch event for other components to listen
      window.dispatchEvent(new CustomEvent('bookmark-changed', {
        detail: { bookmarkableId, bookmarkableType, isBookmarked: newBookmarkState }
      }));

      // 7. If adding bookmark, fetch fresh data and update cache
      if (newBookmarkState) {
        try {
          const freshData = await getAllBookmarkedItems(user.id);
          queryClient.setQueryData(['saved-providers', user.id], freshData);
        } catch (error) {
          console.error('Error fetching fresh bookmarked items:', error);
          // Fallback to invalidation
          queryClient.invalidateQueries({ queryKey: ['saved-providers', user.id] });
        }
      }

    } catch (error) {
      console.error('Error syncing bookmark:', error);
      
      // 8. Revert optimistic updates on error
      queryClient.invalidateQueries({ queryKey: ['bookmarks', user.id] });
      queryClient.invalidateQueries({ queryKey: ['saved-providers', user.id] });
      
      // Revert callback
      onBookmarkChange?.(!newBookmarkState);
    }
  }, [bookmarkableId, bookmarkableType, user, queryClient, onBookmarkChange]);

  return { handleBookmark };
}
