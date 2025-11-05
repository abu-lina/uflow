// External dependencies
import { Inter } from 'next/font/google';

import { Header } from '@/components/layout/Header';
import { RootClientLayout } from '@/components/layout/RootClientLayout';
import { ClientProviders } from '@/components/layout/ClientProviders';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import '@/styles/globals.css';
import '@/styles/toast-custom.css';

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
    "Ummah Flow - der erste halal konforme Marktplatz der Muslime miteinander verbindet",
};

// Force dynamic to ensure proper client-side navigation handling
// This prevents Next.js from statically generating the layout which can cause reloads
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Don't cache layout to ensure client-side navigation works

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Get session for initial user state - this runs server-side but layout persists across navigation
  let user = null;
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    user = session?.user ?? null;
  } catch (error) {
    // If session check fails, continue without user (client will handle auth)
    console.warn('Layout session check failed:', error);
  }
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
        className={`relative w-full max-w-[100vw] overflow-x-hidden bg-gradient-to-b from-[#f5f5f5] to-[#fbfbfb] ${inter.className}`}
        style={{
          minHeight: '100dvh',
          margin: 0,
          padding: 0,
          background: 'linear-gradient(180deg, #f5f5f5 0%, #fbfbfb 100%)',
          backgroundAttachment: 'scroll',
        }}
      >
        <ClientProviders initialUser={user}>
          {/* Desktop header only */}
          <div className="hidden md:block">
            <Header />
          </div>
          <RootClientLayout>{children}</RootClientLayout>
        </ClientProviders>
      </body>
    </html>
  );
}
