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
      className="mb-2 block rounded-xl border border-gray-200 bg-white p-3 transition-all hover:border-primary/40 hover:shadow-sm"
      href={`/p/${provider.provider_id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">{provider.provider_name}</p>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
            {provider.category_name && <span>{provider.category_name}</span>}
            {provider.address_city && (
              <>
                {provider.category_name && <span>·</span>}
                <span>{provider.address_city}</span>
              </>
            )}
          </div>
          {badges.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {badges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary-dark"
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
