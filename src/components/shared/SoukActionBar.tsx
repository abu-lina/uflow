import React from 'react';

import { Icon } from '@iconify/react';

interface SoukActionBarProps {
  onSave?: () => void;
  onShare?: () => void;
  onCall?: () => void;
  onWebsite?: () => void;
  isSaved?: boolean;
  phoneNumber?: string;
  websiteUrl?: string;
  className?: string;
}

export const SoukActionBar: React.FC<SoukActionBarProps> = ({
  onSave,
  onShare,
  onCall,
  onWebsite,
  isSaved = false,
  phoneNumber,
  websiteUrl,
  className = '',
}) => (
  <div className={`flex w-full gap-3.5 ${className}`}>
    {/* Save Button */}
    <button
      aria-label={isSaved ? 'Gespeichert entfernen' : 'Souk speichern'}
      className="flex h-12 flex-1 items-center justify-center gap-1 rounded-lg bg-mint text-base font-medium text-white shadow transition hover:bg-mint/90"
      type="button"
      onClick={onSave}
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
      aria-label="Souk teilen"
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
        <Icon className="text-gray-700" height={20} icon="lucide:phone" width={20} />
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
