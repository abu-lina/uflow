import React from 'react';

import { Icon } from '@iconify/react';
import { useBookmarkWithAuth } from '@/hooks/useBookmarkWithAuth';

interface ProviderActionBarProps {
  onSave?: () => void;
  onShare?: () => void;
  onCall?: () => void;
  onWebsite?: () => void;
  isSaved?: boolean;
  phoneNumber?: string;
  websiteUrl?: string;
  className?: string;
  bookmarkableId?: string;
  bookmarkableType?: 'provider' | 'community_service';
}

export const ProviderActionBar: React.FC<ProviderActionBarProps> = ({
  onSave,
  onShare,
  onCall,
  onWebsite,
  isSaved = false,
  phoneNumber,
  websiteUrl,
  className = '',
  bookmarkableId,
  bookmarkableType = 'provider',
}) => {
  // Use the new bookmark hook with authentication
  const { handleBookmarkAction: checkAuthBeforeBookmark } = useBookmarkWithAuth({
    bookmarkableId: bookmarkableId || '',
    bookmarkableType,
  });

  const handleSaveWithAuth = async () => {
    if (onSave) {
      // Check authentication first - this will show toast if not logged in
      const canProceed = await checkAuthBeforeBookmark();
      if (canProceed) {
        onSave();
      }
    }
  };

  return (
  <div className={`flex w-full gap-3.5 ${className}`}>
    {/* Save Button */}
    <button
      aria-label={isSaved ? 'Gespeichert entfernen' : 'Provider speichern'}
      className="flex h-12 flex-1 items-center justify-center gap-1 rounded-lg bg-mint text-base font-medium text-white shadow transition hover:bg-mint/90"
      type="button"
      onClick={handleSaveWithAuth}
    >
      <Icon
        className="text-white"
        height={20}
        icon={isSaved ? 'iconamoon:heart-fill' : 'iconamoon:heart'}
        width={20}
      />
      {isSaved ? 'Gespeichert' : 'Speichern'}
    </button>

    {/* Share Button */}
    <button
      aria-label="Provider teilen"
      className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#CDCDCD] bg-white/70 backdrop-blur-sm"
      type="button"
      onClick={onShare}
    >
      <Icon className="text-gray-700" height={20} icon="lucide:share-2" width={20} />
    </button>

    {/* Call Button (optional) */}
    {phoneNumber && (
      <a
        aria-label="Anrufen"
        className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#CDCDCD] bg-white/70 backdrop-blur-sm"
        href={`tel:${phoneNumber}`}
        onClick={onCall}
      >
        <Icon className="text-gray-700" height={20} icon="entypo:old-phone" width={20} />
      </a>
    )}

    {/* Website Button (optional) */}
    {websiteUrl && (
      <a
        aria-label="Website"
        className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#CDCDCD] bg-white/70 backdrop-blur-sm"
        href={websiteUrl}
        rel="noopener noreferrer"
        target="_blank"
        onClick={onWebsite}
      >
        <Icon className="text-gray-700" height={20} icon="mdi:web" width={20} />
      </a>
    )}
  </div>
  );
};
