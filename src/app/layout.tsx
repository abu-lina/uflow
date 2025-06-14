// External dependencies
import { Inter } from 'next/font/google';

import { Toaster } from 'sonner';

import { Header } from '@/components/layout/Header';
import { RootClientLayout } from '@/components/layout/RootClientLayout';
import { PWAInstallPrompt } from '@/components/ui/PWAInstallPrompt';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthProvider } from '@/providers/auth-provider';
import { AuthSyncer } from '@/providers/AuthSyncer';
import { FilterProvider } from '@/providers/filter-provider';
import { SearchProvider } from '@/providers/search-provider';
import '@/styles/globals.css';

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;
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
      <body
        className={`relative min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-gradient-to-b from-[#f5f5f5] to-[#fbfbfb] ${inter.className}`}
      >
        <AuthProvider initialUser={user}>
          <AuthSyncer />
          <SearchProvider>
            <FilterProvider>
              {/* Desktop header only */}
              <div className="hidden md:block">
                <Header />
              </div>
              <RootClientLayout>{children}</RootClientLayout>
              <Toaster position="top-center" />
              <PWAInstallPrompt />
            </FilterProvider>
          </SearchProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
