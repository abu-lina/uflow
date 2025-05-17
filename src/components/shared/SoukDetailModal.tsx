import React from 'react';

import Image from 'next/image';

import type { Souk } from '@/services/souks';

interface SoukDetailModalProps {
  souk: Souk;
  onClose: () => void;
}

export const SoukDetailModal: React.FC<SoukDetailModalProps> = ({ souk, onClose }) => {
  function hasUrls(obj: unknown): obj is { urls: string[] } {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      Array.isArray((obj as { urls?: unknown }).urls) &&
      (obj as { urls: unknown[] }).urls.every((u) => typeof u === 'string')
    );
  }

  // Only allow images from trusted domains
  const TRUSTED_IMAGE_DOMAINS = [
    'pmbatjlosstytdmmqkky.supabase.co',
    // add more trusted domains here if needed
  ];

  function isTrustedUrl(url: string) {
    try {
      const { hostname } = new URL(url);
      return TRUSTED_IMAGE_DOMAINS.some((domain) => hostname.endsWith(domain));
    } catch {
      return false;
    }
  }

  const getImageUrl = () => {
    try {
      if (!souk.souk_images) {
        return 'https://pmbatjlosstytdmmqkky.supabase.co/storage/v1/object/public/images//Islamic%20New%20Year%20Background.jpg';
      }

      let imagesData: { urls?: string[] } = {};
      if (typeof souk.souk_images === 'string') {
        try {
          imagesData = JSON.parse(souk.souk_images) as { urls?: string[] };
        } catch {
          imagesData = {};
        }
      } else if (Array.isArray(souk.souk_images)) {
        imagesData.urls = souk.souk_images;
      } else if (hasUrls(souk.souk_images)) {
        imagesData = souk.souk_images;
      }

      if (imagesData.urls && Array.isArray(imagesData.urls) && imagesData.urls.length > 0) {
        const firstTrusted = imagesData.urls.find(isTrustedUrl);
        if (firstTrusted) {
          return firstTrusted;
        }
      }

      return 'https://pmbatjlosstytdmmqkky.supabase.co/storage/v1/object/public/images//Islamic%20New%20Year%20Background.jpg';
    } catch (error) {
      console.error('Error parsing image data:', error);
      return 'https://pmbatjlosstytdmmqkky.supabase.co/storage/v1/object/public/images//Islamic%20New%20Year%20Background.jpg';
    }
  };

  const getThumbnailUrls = () => {
    try {
      if (!souk.souk_images) {
        return [];
      }

      let imagesData: { urls?: string[] } = {};
      if (typeof souk.souk_images === 'string') {
        try {
          imagesData = JSON.parse(souk.souk_images) as { urls?: string[] };
        } catch {
          imagesData = {};
        }
      } else if (Array.isArray(souk.souk_images)) {
        imagesData.urls = souk.souk_images;
      } else if (hasUrls(souk.souk_images)) {
        imagesData = souk.souk_images;
      }

      if (imagesData.urls && Array.isArray(imagesData.urls) && imagesData.urls.length > 0) {
        return imagesData.urls.slice(1, 4).filter(isTrustedUrl);
      }

      return [];
    } catch (error) {
      console.error('Error parsing thumbnail data:', error);
      return [];
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative flex h-[900px] w-[1200px] bg-transparent">
        {/* Left Section */}
        <div className="absolute left-0 top-0 inline-flex h-[900px] w-[704px] flex-col items-start justify-start gap-8 rounded-l-[48px] bg-white py-10 pl-12 pr-4">
          {/* Title & Subtitle */}
          <div className="flex flex-col items-start justify-start gap-2 self-stretch">
            <div className="inline-flex items-center justify-start gap-8 self-stretch">
              <div className="text-uFlowText justify-start font-inter-tight text-3xl font-bold">
                {souk.souk_name}
              </div>
            </div>
            <div className="text-uFlowText2 justify-start self-stretch font-inter text-base font-normal">
              {souk.category?.name_de || ''}
            </div>
          </div>
          {/* Main Image & Thumbnails */}
          <div className="flex h-[640px] flex-col items-start justify-start gap-4">
            <div className="bg-uFlowAccent relative h-[480px] w-[640px] overflow-hidden rounded-[32px]">
              <Image
                fill
                alt={souk.souk_name}
                className="rounded-[32px] object-cover"
                src={getImageUrl()}
              />
              {/* Category label on image */}
              <div className="absolute bottom-3 left-3 inline-flex items-center justify-center rounded-lg bg-zinc-100/70 px-2 py-1 bg-blend-hard-light backdrop-blur-[1.67px]">
                <div className="text-uFlowText justify-start font-inter-tight text-sm font-medium leading-none">
                  {souk.category?.name_de || ''}
                </div>
              </div>
            </div>
            {/* Thumbnails */}
            <div className="inline-flex items-start justify-start gap-4">
              {getThumbnailUrls().map((img, i) => (
                <div
                  key={i}
                  className="bg-uFlowAccent relative h-14 w-20 overflow-hidden rounded-lg"
                >
                  <Image
                    fill
                    alt={`${souk.souk_name} thumbnail`}
                    className="rounded-lg object-cover"
                    src={img}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Right Section */}
        <div className="absolute left-[704px] top-0 inline-flex h-[900px] w-[496px] flex-col items-start justify-start gap-4 rounded-r-[48px] bg-white py-36 pl-4 pr-12">
          {/* Close Button */}
          <button
            aria-label="Schließen"
            className="absolute right-12 top-9 flex size-8 items-center justify-center rounded-full hover:bg-zinc-100"
            type="button"
            onClick={onClose}
          >
            <span
              className="bg-uFlowText absolute block h-0.5 w-6 rotate-45"
              style={{ top: 18, left: 7 }}
            />
            <span
              className="bg-uFlowText absolute block h-0.5 w-6 -rotate-45"
              style={{ top: 18, left: 7 }}
            />
          </button>
          <div className="flex h-[640px] flex-col items-start justify-start gap-8 self-stretch">
            {/* Barakah Effekt Section */}
            <div className="flex flex-col items-start justify-start gap-2.5 self-stretch overflow-hidden rounded-2xl p-4 outline outline-1 outline-offset-[-1px] outline-zinc-100">
              <div className="flex flex-col items-start justify-start gap-4 self-stretch overflow-hidden">
                <div className="text-uFlowText justify-start font-inter-tight text-2xl font-semibold">
                  Unser Barakah Effekt:
                </div>
                <div className="inline-flex items-start justify-between self-stretch">
                  {/* Example Barakah Effekt content here */}
                  <div className="inline-flex flex-col items-start justify-start gap-[4.92px]">
                    <div className="relative h-28 w-40 overflow-hidden rounded-2xl bg-zinc-100">
                      {/* Placeholder for effect image */}
                    </div>
                    <div className="flex flex-col items-start justify-start">
                      <div className="text-uFlowText justify-start self-stretch font-inter-tight text-lg font-semibold">
                        {souk.souk_name}
                      </div>
                      <div className="justify-start self-stretch font-inter-tight text-lg font-normal text-neutral-800">
                        {souk.address_city}
                      </div>
                    </div>
                  </div>
                  {/* ... more effect content as needed ... */}
                </div>
              </div>
            </div>
            {/* Beschreibung Section */}
            <div className="flex flex-col items-start justify-start gap-2.5 self-stretch overflow-hidden rounded-2xl p-4 outline outline-1 outline-offset-[-1px] outline-zinc-100">
              <div className="flex flex-col items-start justify-start gap-4 self-stretch overflow-hidden">
                <div className="inline-flex items-start justify-between self-stretch">
                  <div className="inline-flex flex-1 flex-col items-start justify-start gap-2">
                    <div className="text-uFlowText h-10 w-48 justify-start font-inter-tight text-2xl font-semibold">
                      Beschreibung:
                    </div>
                    <div className="justify-start self-stretch font-inter-tight text-base font-normal leading-tight text-neutral-800">
                      {souk.souk_description ?? ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Adresse Section */}
            <div className="flex flex-col items-start justify-start gap-2.5 self-stretch overflow-hidden rounded-2xl p-4 outline outline-1 outline-offset-[-1px] outline-zinc-100">
              <div className="flex flex-col items-start justify-start gap-4 self-stretch overflow-hidden">
                <div className="inline-flex items-start justify-between self-stretch">
                  <div className="inline-flex flex-1 flex-col items-start justify-start gap-2">
                    <div className="text-uFlowText h-10 w-48 justify-start font-inter-tight text-2xl font-semibold">
                      Adresse:
                    </div>
                    <div className="justify-start self-stretch font-inter-tight text-base font-normal leading-tight text-neutral-800">
                      {souk.address_street},<br />
                      {souk.address_zip} {souk.address_city}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Modal backdrop click to close */}
      <button
        aria-label="Close modal"
        className="fixed inset-0 z-40 cursor-default"
        tabIndex={-1}
        onClick={onClose}
      />
    </div>
  );
};
