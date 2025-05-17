// External dependencies
import { Inter, Inter_Tight } from 'next/font/google';

import { Toaster } from 'sonner';

// Internal imports
import { AuthProvider } from '@/providers/auth-provider';
import '@/styles/globals.css';
import { FilterProvider } from '@/providers/filter-provider';
import { SearchProvider } from '@/providers/search-provider';

// Type imports
import type { Metadata, Viewport } from 'next';

const inter = Inter({ subsets: ['latin'] });
const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter-tight',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: 'hsl(0, 0%, 0%)',
};

export const metadata: Metadata = {
  title: 'Ummah Flow',
  description: 'Der erste halal-konforme Marktplatz',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Ummah Flow',
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    shortcut: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <meta content="yes" name="mobile-web-app-capable" />
      </head>
      <body className={`min-h-screen bg-background ${inter.className} ${interTight.variable}`}>
        <AuthProvider>
          <SearchProvider>
            <FilterProvider>{children}</FilterProvider>
          </SearchProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
