import type { Metadata, Viewport } from 'next';

// App Metadata
export const APP_META = {
  name: 'Ummah Flow',
  description: 'Your trusted marketplace for Islamic services',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  themeColor: '#589D96',
  locale: 'en_US',
} as const;

// Shared metadata values
const SHARED_METADATA = {
  siteName: APP_META.name,
  description: APP_META.description,
  image: {
    url: '/images/og-image.jpg',
    width: 1200,
    height: 630,
    alt: `${APP_META.name} - Islamic Marketplace`,
  },
} as const;

/**
 * Base metadata configuration used across all pages
 */
export const baseMetadata: Metadata = {
  metadataBase: new URL(APP_META.url),
  title: {
    template: `%s | ${SHARED_METADATA.siteName}`,
    default: `${SHARED_METADATA.siteName} | Islamic Marketplace`,
  },
  description: SHARED_METADATA.description,
  manifest: '/manifest.json',
  
  // PWA configuration
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: SHARED_METADATA.siteName,
  },
  
  // Open Graph
  openGraph: {
    type: 'website',
    locale: APP_META.locale,
    url: '/',
    siteName: SHARED_METADATA.siteName,
    images: [SHARED_METADATA.image],
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: `${SHARED_METADATA.siteName} | Islamic Marketplace`,
    description: SHARED_METADATA.description,
    images: [SHARED_METADATA.image.url],
  },
  
  // Default robots policy
  robots: {
    index: true,
    follow: true,
  },
};

/**
 * Viewport configuration
 */
export const baseViewport: Viewport = {
  themeColor: APP_META.themeColor,
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

/**
 * Type for page-specific metadata generators
 */
type MetadataGenerator = {
  title: string;
  description?: string;
  noIndex?: boolean;
};

/**
 * Generate metadata for any page type
 */
export function generateMetadata({ title, description, noIndex = false }: MetadataGenerator): Metadata {
  return {
    ...baseMetadata,
    title,
    description: description || baseMetadata.description,
    openGraph: {
      ...baseMetadata.openGraph,
      title: `${title} | ${SHARED_METADATA.siteName}`,
      description: description || SHARED_METADATA.description,
    },
    twitter: {
      ...baseMetadata.twitter,
      title: `${title} | ${SHARED_METADATA.siteName}`,
      description: description || SHARED_METADATA.description,
    },
    robots: noIndex ? { index: false, follow: false } : baseMetadata.robots,
  };
}

// Specialized metadata generators
export const generateSoukMetadata = (soukName?: string, description?: string): Metadata =>
  generateMetadata({
    title: soukName || 'Souks',
    description,
  });

export const generateAuthMetadata = (page: string): Metadata =>
  generateMetadata({
    title: page,
    noIndex: true,
  }); 