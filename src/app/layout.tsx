// External dependencies
import { Inter } from 'next/font/google';
import Script from 'next/script';

import { Header } from '@/components/layout/Header';
import { RootClientLayout } from '@/components/layout/RootClientLayout';
import { ClientProviders } from '@/components/layout/ClientProviders';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { detectLanguageFromServer } from '@/utils/serverLanguageUtils';
import { generateLocalizedMetadata } from '@/utils/metadataUtils';
import '@/styles/globals.css';
import '@/styles/toast-custom.css';

import type { Metadata, Viewport } from 'next';

// optional = no FOUT on slow connections (avoids text flicker when font loads on iOS)
const inter = Inter({
  subsets: ['latin'],
  display: 'optional',
  preload: true,
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#f5f5f5',
  viewportFit: 'cover',
};

// Get site URL from environment or use default
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ummahflow.com';

// Generate metadata dynamically based on language
// Note: This is a function that will be called during render
// Next.js 14+ supports async generateMetadata for dynamic metadata
export async function generateMetadata(): Promise<Metadata> {
  const language = await detectLanguageFromServer();
  return generateLocalizedMetadata(language, siteUrl);
}

// Layout is inherently dynamic because it calls headers() (language detection)
// and cookies() (session check). Removed force-dynamic to allow child routes
// to be independently cached when they don't use dynamic APIs.
// Plan 010 — P1b: Reduce force-dynamic blast radius

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  // Detect language from server-side (cookies and headers)
  // This ensures the HTML lang attribute matches user preference
  const language = await detectLanguageFromServer();

  // Determine text direction for RTL languages
  const rtlLanguages = ['ar', 'ur', 'ps'];
  const isRtl = rtlLanguages.includes(language);

  // Get session for initial user state
  // This prevents flash of unauthenticated content and provides better UX
  // The client-side AuthProvider will sync and handle subsequent auth changes
  let user = null;
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    user = session?.user ?? null;
  } catch (error) {
    // If session check fails, continue without user (client will handle auth)
    // Log in development for debugging, but don't break the layout
    if (process.env.NODE_ENV === 'development') {
      console.warn('Layout session check failed:', error);
    }
  }

  const themeScript = `
    (function() {
      try {
        var theme = localStorage.getItem('uflow-theme') || 'default';
        document.documentElement.setAttribute('data-theme', theme);
      } catch (e) {}
    })();
  `;

  return (
    <html
      suppressHydrationWarning
      dir={isRtl ? 'rtl' : 'ltr'}
      lang={language}
      style={{ backgroundColor: '#f5f5f5' }}
    >
      <body
        className={`relative m-0 min-h-screen w-full max-w-[100vw] overflow-x-hidden p-0 ${inter.className}`}
        style={{
          // Inline critical background so first paint matches (avoids white flash before CSS loads)
          background: 'linear-gradient(180deg, #f5f5f5 0%, #fbfbfb 100%)',
          minHeight: '100vh',
        }}
      >
        <Script
          dangerouslySetInnerHTML={{ __html: themeScript }}
          id="theme-init"
          strategy="beforeInteractive"
        />
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
