/**
 * Metadata utilities for localized SEO content
 */

import type { Metadata } from 'next';
import type { ServerLanguage } from './languageUtils';

// Language to Open Graph locale mapping
const localeMap: Record<ServerLanguage, string> = {
  de: 'de_DE',
  en: 'en_US',
  ar: 'ar_SA',
  tr: 'tr_TR',
};

// Localized metadata content
const metadataContent: Record<ServerLanguage, { title: string; description: string }> = {
  de: {
    title: 'Ummah Flow',
    description: 'Ummah Flow - der erste halal konforme Marktplatz der Muslime miteinander verbindet',
  },
  en: {
    title: 'Ummah Flow',
    description: 'Ummah Flow - the first halal-compliant marketplace connecting Muslims',
  },
  ar: {
    title: 'Ummah Flow',
    description: 'Ummah Flow - أول سوق حلال يربط المسلمين ببعضهم البعض',
  },
  tr: {
    title: 'Ummah Flow',
    description: 'Ummah Flow - Müslümanları birbirine bağlayan ilk helal uyumlu pazar yeri',
  },
};

/**
 * Generate localized metadata based on language
 */
export function generateLocalizedMetadata(language: ServerLanguage, siteUrl: string): Metadata {
  const content = metadataContent[language];
  const locale = localeMap[language];

  return {
    title: {
      default: content.title,
      template: `%s | ${content.title}`,
    },
    description: content.description,
    keywords: ['halal', 'marktplatz', 'muslime', 'community', 'islamic marketplace'],
    authors: [{ name: 'Ummah Flow' }],
    creator: 'Ummah Flow',
    publisher: 'Ummah Flow',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      locale,
      url: siteUrl,
      siteName: content.title,
      title: content.title,
      description: content.description,
      images: [
        {
          url: '/icons/icon-512x512.png',
          width: 512,
          height: 512,
          alt: `${content.title} Logo`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: content.title,
      description: content.description,
      images: ['/icons/icon-512x512.png'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    manifest: '/api/manifest',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: content.title,
    },
    icons: {
      icon: [
        { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
        { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
      apple: [
        // iOS requires 180x180 for home screen icon, fallback to 192x192 if not available
        { url: '/icons/icon-180x180.png', sizes: '180x180', type: 'image/png' },
        { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      ],
    },
  };
}

