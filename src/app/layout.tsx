// External dependencies
import { Inter } from 'next/font/google';

import { Toaster } from 'sonner';

import { Header } from '@/components/layout/Header';
import { RootClientLayout } from '@/components/layout/RootClientLayout';
import { PWAInstallPrompt } from '@/components/ui/PWAInstallPrompt';
import { SplashScreenDebug } from '@/components/debug/SplashScreenDebug';
import { SafeAreaTester } from '@/components/debug/SafeAreaTester';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AuthProvider } from '@/providers/auth-provider';
import { AuthSyncer } from '@/providers/AuthSyncer';
import { FilterProvider } from '@/providers/filter-provider';
import { FormProvider } from '@/providers/form-provider';
import { QueryProvider } from '@/providers/query-provider';
import { SearchProvider } from '@/providers/search-provider';
import { SplashProvider } from '@/providers/splash-provider';
import '@/styles/globals.css';

import type { Metadata, Viewport } from 'next';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#f5f5f5',
  viewportFit: 'cover',
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
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
          name="viewport"
        />
        <meta content="#f5f5f5" name="theme-color" />
        <meta content="#f5f5f5" name="apple-mobile-web-app-status-bar-style" />
        <meta content="default" name="apple-mobile-web-app-status-bar-style" />
        <link href="/manifest.json" rel="manifest" />
        <link href="/icons/icon-192x192.png" rel="apple-touch-icon" />
      </head>
      <body
        className={`relative min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-gradient-to-b from-[#f5f5f5] to-[#fbfbfb] ${inter.className}`}
        style={{
          minHeight: '100dvh',
          margin: 0,
          padding: 0,
          background: 'linear-gradient(180deg, #f5f5f5 0%, #fbfbfb 100%)',
          backgroundAttachment: 'scroll',
        }}
      >
        <QueryProvider>
          <AuthProvider initialUser={user}>
            <AuthSyncer />
            <FormProvider>
              <SplashProvider>
                <SearchProvider>
                  <FilterProvider>
                {/* Desktop header only */}
                <div className="hidden md:block">
                  <Header />
                </div>
                <RootClientLayout>{children}</RootClientLayout>
                        <Toaster position="top-center" />
                        <PWAInstallPrompt />
                        <SplashScreenDebug />
                        {/* Safe Area Tester - Remove in production */}
                        {process.env.NODE_ENV === 'development' && (
                          <SafeAreaTester />
                        )}
                  </FilterProvider>
                </SearchProvider>
              </SplashProvider>
            </FormProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
