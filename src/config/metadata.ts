import { Metadata } from 'next';
import { APP_CONFIG } from './constants/app';

// Base metadata configuration
export const baseMetadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: APP_CONFIG.name,
    template: `%s | ${APP_CONFIG.name}`,
  },
  description: APP_CONFIG.description,
  keywords: [...APP_CONFIG.keywords],
  authors: [{ name: APP_CONFIG.author }],
  creator: APP_CONFIG.name,
  publisher: APP_CONFIG.name,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
  },
} as const;

// Error page metadata
export const errorMetadata: Metadata = {
  ...baseMetadata,
  title: `Error | ${APP_CONFIG.name}`,
  description: 'An unexpected error occurred. Please try again later.',
  robots: {
    index: false,
    follow: false,
  },
} as const;

// Offline page metadata
export const offlineMetadata: Metadata = {
  ...baseMetadata,
  title: `You're Offline | ${APP_CONFIG.name}`,
  description: 'You are currently offline. Some features may be unavailable.',
  robots: {
    index: false,
    follow: false,
  },
} as const;

// Auth page metadata options
interface AuthMetadataOptions {
  title?: string;
  description?: string;
  keywords?: string[];
}

// Generate metadata for auth pages
export function generateAuthMetadata(pageName: string, options: AuthMetadataOptions = {}): Metadata {
  return {
    ...baseMetadata,
    title: `${pageName} | ${APP_CONFIG.name}`,
    description: options.description || `Sign ${pageName.toLowerCase()} to ${APP_CONFIG.name}`,
    keywords: options.keywords || [...APP_CONFIG.keywords, pageName.toLowerCase()],
  };
} 