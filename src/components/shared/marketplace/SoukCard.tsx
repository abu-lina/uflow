import Image from 'next/image';
import Link from 'next/link';

import { Card } from '@/components/ui';
import type { SoukListItem } from '@/features/souks/types';
import { cn } from '@/lib/utils';

interface SoukCardProps {
  souk: SoukListItem;
  className?: string;
}

export function SoukCard({ souk, className }: SoukCardProps) {
  const { souk_id, title, description, logo_url, location, owner } = souk;

  const formattedLocation = location?.country || 'Standort nicht angegeben';

  return (
    <Link className={cn('block', className)} href={`/souks/${souk_id}`}>
      <Card className="group p-4 transition-all duration-200 hover:shadow-lg">
        <div className="flex items-start gap-4">
          {logo_url && (
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg">
              <Image
                fill
                alt={`${title} Logo`}
                className="object-cover"
                sizes="64px"
                src={logo_url}
              />
            </div>
          )}

          <div className="min-w-0 flex-grow">
            <h3 className="truncate text-lg font-semibold transition-colors group-hover:text-primary">
              {title}
            </h3>

            <p className="mt-1 line-clamp-2 text-sm text-gray-600">{description}</p>

            {owner && (
              <div className="mt-2 flex items-center gap-2">
                {owner.avatar_url && (
                  <div className="relative h-6 w-6 overflow-hidden rounded-full">
                    <Image
                      fill
                      alt={owner.full_name}
                      className="object-cover"
                      sizes="24px"
                      src={owner.avatar_url}
                    />
                  </div>
                )}
                <span className="truncate text-sm text-gray-500">{owner.full_name}</span>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-gray-500">{formattedLocation}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
