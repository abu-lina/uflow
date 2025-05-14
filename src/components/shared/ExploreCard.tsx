import { forwardRef } from 'react';

import Image from 'next/image';

import { Icon } from '@iconify/react';
import ShareIcon from '@mui/icons-material/Share';

import { Button } from '@/components/ui/Button';
import { OrnamentIcon } from '@/components/ui/OrnamentIcon';
import type { Souk } from '@/services/souks';

interface ExploreCardProps extends Omit<Souk, 'id' | 'category_id'> {
  className?: string;
  gradient?: boolean;
}

export const ExploreCard = forwardRef<HTMLDivElement, ExploreCardProps>(
  (
    {
      address_street,
      address_zip,
      address_city,
      category,
      gradient = false,
      souk_images,
      barakah_effects = [],
      souk_name,
      className,
    },
    ref,
  ) => {
    const address = `${address_street}, ${address_zip} ${address_city}`;
    const categoryName = category?.name_de || '';

    // Type guard for object with urls
    function hasUrls(obj: unknown): obj is { urls: string[] } {
      return (
        typeof obj === 'object' &&
        obj !== null &&
        Array.isArray((obj as { urls?: unknown }).urls) &&
        (obj as { urls: unknown[] }).urls.every((u) => typeof u === 'string')
      );
    }

    // Handle image URL
    const getImageUrl = () => {
      try {
        if (!souk_images) {
          return 'https://pmbatjlosstytdmmqkky.supabase.co/storage/v1/object/public/images//Islamic%20New%20Year%20Background.jpg';
        }

        let imagesData: { urls?: string[] } = {};
        if (typeof souk_images === 'string') {
          try {
            imagesData = JSON.parse(souk_images) as { urls?: string[] };
          } catch {
            imagesData = {};
          }
        } else if (Array.isArray(souk_images)) {
          imagesData.urls = souk_images;
        } else if (hasUrls(souk_images)) {
          imagesData = souk_images;
        }

        if (imagesData.urls && Array.isArray(imagesData.urls) && imagesData.urls.length > 0) {
          return imagesData.urls[0];
        }

        return 'https://pmbatjlosstytdmmqkky.supabase.co/storage/v1/object/public/images//Islamic%20New%20Year%20Background.jpg';
      } catch (error) {
        console.error('Error parsing image data:', error);
        return 'https://pmbatjlosstytdmmqkky.supabase.co/storage/v1/object/public/images//Islamic%20New%20Year%20Background.jpg';
      }
    };

    return (
      <div ref={ref} className={`inline-flex shrink-0 flex-col items-start ${className || ''}`}>
        <div className="relative flex h-64 w-72 flex-col items-center justify-between">
          {gradient ? (
            <div
              className="absolute left-0 top-0 flex h-64 w-72 flex-col items-center justify-between 
              rounded-t-3xl bg-gradient-to-r from-orange-300 via-orange-200 to-stone-500"
            />
          ) : (
            <div className="border-uFlowWhite absolute left-0 top-0 h-64 w-72 overflow-hidden rounded-t-3xl border">
              <Image
                fill
                alt={souk_name}
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 288px"
                src={getImageUrl()}
              />
            </div>
          )}
          <div className="flex flex-col items-end self-stretch p-3">
            <div className="inline-flex size-6 items-center justify-center overflow-hidden rounded-[7.2px] bg-[rgba(255,255,255,0.7)] backdrop-blur-md">
              <ShareIcon
                sx={{
                  width: '14.4px',
                  height: '14.4px',
                  color: '#232323',
                }}
              />
            </div>
          </div>
          <div className="flex flex-col items-start justify-end self-stretch p-3">
            <div className="inline-flex h-6 items-center justify-center overflow-hidden rounded-[0.45rem] bg-white/70 px-2 backdrop-blur-[1.50px]">
              <div className="justify-center text-center font-['Inter_Tight'] text-sm font-medium text-black">
                {categoryName}
              </div>
            </div>
          </div>
        </div>
        <div
          className="bg-uFlowWhite flex w-72 flex-col items-center rounded-b-3xl p-3.5 
        outline outline-[0.84px] outline-offset-[-0.84px] outline-neutral-300"
        >
          <div className="flex w-full flex-col items-start gap-3.5">
            <div className="flex flex-col items-start gap-0.5">
              <span
                className="text-uFlowText truncate font-inter-tight text-xl font-semibold"
                title={souk_name}
              >
                {souk_name}
              </span>
              <span className="text-uFlowText2 font-inter text-sm font-normal">{address}</span>
            </div>
            <div className="flex gap-2">
              {(barakah_effects || []).map((effect, index) => (
                <span
                  key={index}
                  className="outline-uFlowDarkGrey text-uFlowText flex items-center rounded px-1 py-0.5 
                  font-inter-tight text-sm font-medium leading-none outline outline-1 outline-offset-[-0.93px]"
                >
                  {effect}
                </span>
              ))}
              <span
                className="outline-uFlowDarkGrey text-uFlowText flex size-5 items-center justify-center rounded px-2 py-1 
              font-inter-tight text-sm font-medium leading-none outline outline-1 outline-offset-[-0.93px]"
              >
                +
              </span>
            </div>
            <div className="my-2 h-px w-full bg-zinc-100" />
            <div className="flex w-full gap-3.5">
              <Button
                aria-label="Speichern"
                className="flex-1 gap-1"
                icon={
                  <div className="relative size-4">
                    <OrnamentIcon className="absolute left-0 top-0" size={16} />
                  </div>
                }
              >
                Speichern
              </Button>
              <Button
                aria-label="Website"
                className="flex-1 items-center justify-center gap-1.5"
                icon={
                  <div className="flex items-center">
                    <Icon height={16} icon="mdi:web" width={16} />
                  </div>
                }
                variant={gradient ? 'gradient' : 'default'}
              >
                Website
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

ExploreCard.displayName = 'ExploreCard';
