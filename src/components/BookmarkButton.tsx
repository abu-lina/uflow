import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import supabase from '@/lib/supabase';

interface BookmarkButtonProps {
  businessId: string;
  isBookmarked: boolean;
}

const BookmarkButton: React.FC<BookmarkButtonProps> = ({ businessId, isBookmarked: initialIsBookmarked }) => {
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  const toggleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // If user is not logged in, redirect to login page
    if (!user) {
      router.push('/auth/login?redirectedFrom=' + encodeURIComponent(window.location.pathname));
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const action = isBookmarked ? 'remove' : 'add';
      
      if (action === 'add') {
        // Check if already bookmarked
        const { data: existingBookmark, error: checkError } = await supabase
          .from('bookmarks')
          .select('id')
          .eq('user_id', user.id)
          .eq('bookmarkable_id', businessId)
          .eq('bookmarkable_type', 'business')
          .single();
          
        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found, which is expected
          throw new Error(checkError.message);
        }
        
        if (existingBookmark) {
          // Already bookmarked
          setIsBookmarked(true);
          return;
        }
        
        // Add new bookmark
        const { error: insertError } = await supabase
          .from('bookmarks')
          .insert({
            user_id: user.id,
            bookmarkable_id: businessId,
            bookmarkable_type: 'business'
          });
          
        if (insertError) {
          throw new Error(insertError.message);
        }
      } else {
        // Remove bookmark
        const { error: deleteError } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('bookmarkable_id', businessId)
          .eq('bookmarkable_type', 'business');
          
        if (deleteError) {
          throw new Error(deleteError.message);
        }
      }
      
      // Update UI state
      setIsBookmarked(!isBookmarked);
      router.refresh(); // Refresh the page to update any lists that might show bookmarks
      
    } catch (err) {
      console.error('Error toggling bookmark:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={toggleBookmark}
      disabled={isLoading}
      className="absolute right-2 top-2 z-10"
      title={!user ? 'Login to bookmark' : (isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks')}
      aria-label={!user ? 'Login to bookmark' : (isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks')}
    >
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
          </div>
        )}
        
        <svg width="40" height="40" viewBox="0 0 81 81" fill="none" xmlns="http://www.w3.org/2000/svg" 
          style={{ opacity: isLoading ? 0.5 : 1 }}>
          <path 
            d="M60.8903 24.6097C59.7486 23.4675 58.3931 22.5614 56.9011 21.9432C55.4092 21.325 53.8101 21.0068 52.1952 21.0068C50.5802 21.0068 48.9811 21.325 47.4892 21.9432C45.9972 22.5614 44.6417 23.4675 43.5001 24.6097L41.1307 26.979L38.7614 24.6097C36.4553 22.3036 33.3275 21.008 30.0663 21.008C26.805 21.008 23.6772 22.3036 21.3712 24.6097C19.0651 26.9157 17.7695 30.0435 17.7695 33.3048C17.7695 36.566 19.0651 39.6938 21.3712 41.9999L41.1307 61.7594L60.8903 41.9999C62.0325 40.8582 62.9385 39.5027 63.5567 38.0107C64.1749 36.5188 64.4931 34.9197 64.4931 33.3048C64.4931 31.6898 64.1749 30.0907 63.5567 28.5988C62.9385 27.1068 62.0325 25.7513 60.8903 24.6097Z" 
            fill={isBookmarked ? "#FF4B4B" : "transparent"}
            stroke="white" 
            strokeWidth="2.47" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
        
        {error && (
          <div className="absolute bottom-0 right-0 transform translate-x-1/2 translate-y-1/2">
            <div className="bg-red-500 text-white text-xs p-1 rounded-full">!</div>
          </div>
        )}
      </div>
    </button>
  );
};

export default BookmarkButton; 