// External dependencies
import { Inter } from 'next/font/google';

import { Toaster } from 'sonner';

// Internal imports
import { MobileLayoutWrapper } from '@/components/layout/MobileLayoutWrapper';
import { AuthProvider } from '@/providers/auth-provider';
import { AuthSyncer } from '@/providers/AuthSyncer';
import { FilterProvider } from '@/providers/filter-provider';
import { SearchProvider } from '@/providers/search-provider';
import '@/styles/globals.css';

// Type imports
import type { Metadata, Viewport } from 'next';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: 'hsl(0, 0%, 0%)',
};

export const metadata: Metadata = {
  title: 'Ummah Flow',
  description:
    "Der erste halal-konforme Marktplatz der sicherstellt, das Jeder die Zakat entrichtet insha'Allah.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <meta
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
          name="viewport"
        />
        <meta content="#000000" name="theme-color" />
        <link href="/manifest.json" rel="manifest" />
        <link href="/icons/icon-192x192.png" rel="apple-touch-icon" />
      </head>
      <body className={`relative min-h-screen ${inter.className}`}>
        <AuthProvider>
          <AuthSyncer />
          <SearchProvider>
            <FilterProvider>
              <MobileLayoutWrapper>{children}</MobileLayoutWrapper>
              <Toaster position="top-center" />
            </FilterProvider>
          </SearchProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
