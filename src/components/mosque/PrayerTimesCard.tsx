'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { getPrayerTimes, findMawaqitMosqueByName } from '@/services/mawaqitService';
import type { PrayerTime } from '@/types/mawaqit';
import type { OSMPlace } from '@/types/osm';

interface PrayerTimesCardProps {
  mosque: OSMPlace;
  className?: string;
}

/**
 * Format time from HH:MM to readable format
 */
function formatPrayerTime(time: string): string {
  if (!time) return '--:--';
  // Handle different time formats (HH:MM, HH:MM:SS, etc.)
  const parts = time.split(':');
  return `${parts[0]}:${parts[1] || '00'}`;
}

/**
 * Get prayer name in German/English
 */
function getPrayerName(prayer: keyof PrayerTime): string {
  const prayerNames: Record<string, string> = {
    fajr: 'Fajr',
    dhuhr: 'Dhuhr',
    asr: 'Asr',
    maghrib: 'Maghrib',
    isha: 'Isha',
    jummah: 'Jummah',
  };
  return prayerNames[prayer] || prayer;
}

/**
 * Prayer Times Card Component
 * 
 * Displays prayer times for a selected mosque using Mawaqit API
 */
export function PrayerTimesCard({ mosque, className }: PrayerTimesCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [mawaqitMosqueId, setMawaqitMosqueId] = useState<string | null>(null);

  // Find mosque in Mawaqit database
  const { data: mawaqitMosque, isLoading: isSearching } = useQuery({
    queryKey: ['mawaqit-mosque-search', mosque.name, mosque.lat, mosque.lon],
    queryFn: async () => {
      const found = await findMawaqitMosqueByName(
        mosque.name,
        mosque.lat,
        mosque.lon
      );
      if (found) {
        setMawaqitMosqueId(found.id);
      }
      return found;
    },
    enabled: mosque.placeType === 'mosque' || mosque.placeType === 'islamic_center',
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch prayer times
  const { data: prayerTimes, isLoading: isLoadingTimes, error } = useQuery({
    queryKey: ['mawaqit-prayer-times', mawaqitMosqueId],
    queryFn: async () => {
      if (!mawaqitMosqueId) return null;
      return await getPrayerTimes(mawaqitMosqueId);
    },
    enabled: !!mawaqitMosqueId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Only show if it's a mosque and we have data or are loading
  if (mosque.placeType !== 'mosque' && mosque.placeType !== 'islamic_center') {
    return null;
  }

  const isLoading = isSearching || isLoadingTimes;
  const hasData = !!prayerTimes;
  const hasError = !!error || (!isLoading && !mawaqitMosque);

  return (
    <div className={cn('rounded-2xl border border-border bg-white', className)}>
      {/* Header - Collapsible */}
      <button
        aria-expanded={isExpanded}
        aria-label="Toggle prayer times"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" icon="mdi:mosque" />
          <h3 className="text-base font-semibold text-content-heading">
            Prayer Times
          </h3>
        </div>
        <Icon
          className={cn(
            'h-5 w-5 text-content-muted transition-transform',
            isExpanded && 'rotate-180'
          )}
          icon="mdi:chevron-down"
        />
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Icon
                className="h-6 w-6 animate-spin text-primary"
                icon="material-symbols:progress-activity"
              />
            </div>
          )}

          {hasError && !isLoading && (
            <div className="py-4 text-center text-sm text-content-muted">
              Prayer times not available for this mosque
            </div>
          )}

          {hasData && prayerTimes && (
            <div className="flex flex-col gap-2">
              {/* Today's date */}
              <div className="mb-2 text-xs text-content-muted">
                {new Date().toLocaleDateString('de-DE', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>

              {/* Prayer times list */}
              <div className="flex flex-col gap-2">
                {(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((prayer) => (
                  <div
                    key={prayer}
                    className="flex items-center justify-between rounded-lg bg-neutral-muted/50 px-3 py-2"
                  >
                    <span className="text-sm font-medium text-content">
                      {getPrayerName(prayer)}
                    </span>
                    <span className="text-sm font-semibold text-content-heading">
                      {formatPrayerTime(prayerTimes[prayer])}
                    </span>
                  </div>
                ))}

                {/* Jummah time if available */}
                {prayerTimes.jummah && (
                  <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2 border border-primary/20">
                    <span className="text-sm font-medium text-primary">
                      {getPrayerName('jummah')}
                    </span>
                    <span className="text-sm font-semibold text-primary">
                      {formatPrayerTime(prayerTimes.jummah)}
                    </span>
                  </div>
                )}
              </div>

              {/* Source attribution */}
              <div className="mt-3 text-xs text-content-muted text-center">
                Prayer times from Mawaqit
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
