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
  ur: 'ur_PK',
  ps: 'ps_AF',
};

// Localized metadata content
const metadataContent: Record<ServerLanguage, { title: string; description: string }> = {
  de: {
    title: 'Ummah Flow',
    description:
      'Halal essen in deiner Stadt. Ummah Flow zeigt dir geprüfte Restaurants — transparent und mit Barakah.',
  },
  en: {
    title: 'Ummah Flow',
    description:
      'Halal food in your city. Ummah Flow shows you verified restaurants — transparent and with Barakah.',
  },
  ar: {
    title: 'Ummah Flow',
    description: 'أكل حلال في مدينتك. يُريك Ummah Flow المطاعم المعتمدة — بشفافية وبركة.',
  },
  tr: {
    title: 'Ummah Flow',
    description:
      'Şehrinde helal yemek. Ummah Flow sana doğrulanmış restoranları gösterir — şeffaf ve bereketli.',
  },
  ur: {
    title: 'Ummah Flow',
    description:
      'آپ کے شہر میں حلال کھانا۔ Ummah Flow آپ کو تصدیق شدہ ریستوران دکھاتا ہے — شفاف اور برکت کے ساتھ۔',
  },
  ps: {
    title: 'Ummah Flow',
    description:
      'ستاسو ښار کې حلال خواړه. Ummah Flow تاسو ته تصدیق شوي رستورانونه ښیي — روښانه او د برکت سره.',
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
    keywords: ['halal', 'plattform', 'muslime', 'community', 'islamic platform'],
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
    // Issue 533 — deliberately no `index`/`follow` in the robots metadata.
    //
    // This metadata comes from the ROOT layout, so it applies to every
    // response including not-found renders. On a notFound() response Next
    // injects `<meta name="robots" content="noindex">`, which used to sit next
    // to an unconditional `index, follow` tag from here — contradictory
    // instructions on the same page (measured on /p/<unknown-id>: HTTP 200,
    // not-found body, `index, follow`). Omitting index/follow is equivalent
    // for real pages (that is the crawler default) and leaves not-found
    // responses with noindex only. Routes that need a non-default rule set
    // `robots` in their own `generateMetadata`.
    //
    // The googleBot block stays because its directives are NOT crawler
    // defaults — dropping max-image-preview/max-snippet/max-video-preview
    // would shrink Google's previews site-wide. They carry no index/follow
    // instruction, so they cannot contradict the injected noindex.
    robots: {
      googleBot: {
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent', // Better for iOS standalone mode
      title: content.title,
      startupImage: [
        {
          url: '/icons/icon-512x512.png',
          media: '(device-width: 390px) and (device-height: 844px)', // iPhone 14/15
        },
      ],
    },
    other: {
      // Critical for Safari PWA recognition
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'black-translucent',
      'apple-mobile-web-app-title': content.title,
      'mobile-web-app-capable': 'yes',
      // Ensure manifest is discovered
      'theme-color': '#589D96',
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
