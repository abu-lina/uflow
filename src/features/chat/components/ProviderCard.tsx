'use client';

import Link from 'next/link';
import type { ProviderCardData } from '@/features/chat/types';

interface ProviderCardProps {
  provider: ProviderCardData;
}

export function ProviderCard({ provider }: ProviderCardProps) {
  const badges: string[] = [];
  if (provider.muslim_owned) badges.push('Muslim-geführt');
  if (provider.has_prayer_space) badges.push('Gebetsraum');
  if (provider.family_friendly) badges.push('Familienfreundlich');
  if (provider.women_friendly) badges.push('Frauenfreundlich');

  return (
    <Link
      href={`/providers/${provider.provider_id}`}
      className="block p-3 bg-white rounded-xl border border-gray-200 hover:border-teal-300 hover:shadow-sm transition-all mb-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">
            {provider.provider_name}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
            {provider.category_name && (
              <span>{provider.category_name}</span>
            )}
            {provider.address_city && (
              <>
                {provider.category_name && <span>·</span>}
                <span>{provider.address_city}</span>
              </>
            )}
          </div>
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {badges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-50 text-teal-700"
                >
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
