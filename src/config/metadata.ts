/**
 * Centralized Metadata Configuration for Ummah Flow
 * 
 * This module provides a single source of truth for metadata across the application,
 * ensuring consistency, scalability, and easier maintenance.
 */

import type { Metadata, Viewport } from 'next';

// Determine the base URL based on environment
const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  // Fallback based on environment
  if (process.env.NODE_ENV === 'production') {
    return 'https://ummahflow.com';
  }
  return 'http://localhost:3000';
};

/**
 * Base metadata configuration used across all pages
 */
export const baseMetadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    template: '%s | Ummah Flow',
    default: 'Ummah Flow | Islamic Marketplace',
  },
  description: 'A marketplace for halal services and products',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Ummah Flow',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Ummah Flow',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Ummah Flow - Islamic Marketplace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ummah Flow | Islamic Marketplace',
    description: 'A marketplace for halal services and products',
    images: ['/images/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

/**
 * Standard viewport configuration
 */
export const baseViewport: Viewport = {
  themeColor: '#589D96',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

/**
 * Generate specialized metadata for service pages
 */
export function generateServiceMetadata(serviceName?: string, description?: string): Metadata {
  return {
    ...baseMetadata,
    title: serviceName || baseMetadata.title,
    description: description || baseMetadata.description,
    openGraph: {
      ...baseMetadata.openGraph,
      title: serviceName ? `${serviceName} | Ummah Flow` : 'Ummah Flow | Islamic Marketplace',
      description: description || 'A marketplace for halal services and products',
    },
    twitter: {
      ...baseMetadata.twitter,
      title: serviceName ? `${serviceName} | Ummah Flow` : 'Ummah Flow | Islamic Marketplace',
      description: description || 'A marketplace for halal services and products',
    },
  };
}

/**
 * Generate specialized metadata for auth pages
 */
export function generateAuthMetadata(page: string): Metadata {
  return {
    ...baseMetadata,
    title: `${page} | Ummah Flow`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

/**
 * Generate specialized metadata for admin/dashboard pages
 */
export function generateAdminMetadata(page: string): Metadata {
  return {
    ...baseMetadata,
    title: `${page} | Admin Dashboard | Ummah Flow`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

/**
 * Generate specialized metadata for reviewer pages
 */
export function generateReviewerMetadata(page: string): Metadata {
  return {
    ...baseMetadata,
    title: `${page} | Reviewer Dashboard | Ummah Flow`,
    robots: {
      index: false,
      follow: false,
    },
  };
} 