'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import Image from 'next/image';

interface InstagramImportProps {
  onImport: (instagramData: InstagramData) => void;
}

export interface InstagramData {
  username: string;
  name: string;
  biography: string;
  website?: string;
  profilePicUrl?: string;
  recentImages: string[];
  followersCount?: number;
  isBusinessAccount?: boolean;
  businessCategory?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAddress?: string;
}

export function InstagramImport({ onImport }: InstagramImportProps) {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<InstagramData | null>(null);

  const handleSearch = async () => {
    if (!username.trim()) {
      setError('Please enter an Instagram username');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPreviewData(null);

    try {
      // Clean username (remove @ if present)
      const cleanUsername = username.replace('@', '').trim();

      // Call our API route to scrape Instagram data
      const response = await fetch('/api/instagram/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: cleanUsername }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch Instagram data');
      }

      const data: InstagramData = await response.json();
      setPreviewData(data);
    } catch (err) {
      console.error('Error fetching Instagram data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch Instagram profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = () => {
    if (previewData) {
      onImport(previewData);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Instagram Username Input */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-content-title">
          Instagram Username
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999999]">
              <Icon className="h-5 w-5" icon="mdi:at" />
            </div>
            <input
              className="w-full rounded-2xl border border-[#D4D4D4] bg-white px-4 pl-11 py-3 text-[15px] font-medium text-[#272727] placeholder:text-[#999999] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              placeholder="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={handleKeyPress}
            />
          </div>
          <button
            className={`rounded-2xl px-6 py-3 font-medium transition-all flex items-center justify-center min-w-[100px] ${
              isLoading
                ? 'bg-primary/50 cursor-not-allowed'
                : 'bg-primary hover:bg-primary-dark'
            }`}
            disabled={isLoading}
            onClick={handleSearch}
          >
            {isLoading ? (
              <Icon
                className="h-5 w-5 text-white animate-spin"
                icon="mdi:loading"
              />
            ) : (
              <span className="text-white">Search</span>
            )}
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <Icon className="h-4 w-4" icon="mdi:alert-circle" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-xs text-[#7A7A7A]">
          Enter the Instagram username of your business (without @)
        </p>
      </div>

      {/* Preview Card */}
      {previewData && (
        <div className="rounded-2xl border border-[#D4D4D4] bg-white p-4 space-y-4 animate-in fade-in duration-300">
          {/* Header with Profile */}
          <div className="flex items-start gap-3">
            {previewData.profilePicUrl && (
              <Image
                alt={previewData.username}
                className="h-16 w-16 rounded-full object-cover"
                height={64}
                src={previewData.profilePicUrl}
                width={64}
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base text-content-title truncate">
                {previewData.name}
              </h3>
              <p className="text-sm text-[#999999]">@{previewData.username}</p>
              {previewData.followersCount && (
                <p className="text-xs text-[#7A7A7A] mt-1">
                  {previewData.followersCount.toLocaleString()} followers
                </p>
              )}
            </div>
            <Icon className="h-6 w-6 text-[#E4405F]" icon="mdi:instagram" />
          </div>

          {/* Biography */}
          {previewData.biography && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-[#999999]">BIO</p>
              <p className="text-sm text-content leading-relaxed">
                {previewData.biography}
              </p>
            </div>
          )}

          {/* Business Info */}
          {(previewData.businessCategory || previewData.businessEmail || previewData.businessPhone) && (
            <div className="space-y-2 pt-2 border-t border-[#E5E5E5]">
              <p className="text-xs font-medium text-[#999999]">BUSINESS INFO</p>
              {previewData.businessCategory && (
                <div className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4 text-primary" icon="mdi:briefcase" />
                  <span className="text-content">{previewData.businessCategory}</span>
                </div>
              )}
              {previewData.businessEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4 text-primary" icon="mdi:email" />
                  <span className="text-content">{previewData.businessEmail}</span>
                </div>
              )}
              {previewData.businessPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4 text-primary" icon="mdi:phone" />
                  <span className="text-content">{previewData.businessPhone}</span>
                </div>
              )}
            </div>
          )}

          {/* Website */}
          {previewData.website && (
            <div className="flex items-center gap-2 text-sm pt-2 border-t border-[#E5E5E5]">
              <Icon className="h-4 w-4 text-primary" icon="mdi:link" />
              <a
                className="text-primary hover:underline truncate"
                href={previewData.website}
                rel="noopener noreferrer"
                target="_blank"
              >
                {previewData.website}
              </a>
            </div>
          )}

          {/* Recent Images */}
          {previewData.recentImages && previewData.recentImages.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#E5E5E5]">
              <p className="text-xs font-medium text-[#999999]">
                RECENT POSTS ({previewData.recentImages.length})
              </p>
              <div className="grid grid-cols-4 gap-2">
                {previewData.recentImages.slice(0, 8).map((imageUrl, index) => (
                  <Image
                    key={index}
                    alt={`Post ${index + 1}`}
                    className="aspect-square rounded-lg object-cover"
                    height={100}
                    src={imageUrl}
                    width={100}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Import Button */}
          <button
            className="w-full rounded-xl bg-primary hover:bg-primary-dark px-5 py-3 text-base font-medium text-white transition-colors flex items-center justify-center gap-2"
            type="button"
            onClick={handleImport}
          >
            <Icon className="h-5 w-5" icon="mdi:import" />
            <span>Import this business</span>
          </button>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Icon
            className="h-5 w-5 text-primary mt-0.5 flex-shrink-0"
            icon="mdi:information"
          />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-content-title">
              Import from Instagram
            </p>
            <p className="text-xs text-content leading-relaxed">
              We&apos;ll automatically import the business name, bio, website, and recent photos 
              from the Instagram profile.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

