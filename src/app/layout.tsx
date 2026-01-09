// External dependencies
import { Inter } from 'next/font/google';

import { Header } from '@/components/layout/Header';
import { RootClientLayout } from '@/components/layout/RootClientLayout';
import { ClientProviders } from '@/components/layout/ClientProviders';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { detectLanguageFromServer } from '@/utils/serverLanguageUtils';
import { generateLocalizedMetadata } from '@/utils/metadataUtils';
import '@/styles/globals.css';
import '@/styles/toast-custom.css';

import type { Metadata, Viewport } from 'next';

// Optimize font loading with display swap for better perceived performance
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
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

// Force dynamic rendering to support:
// 1. Server-side session check for initial user state (prevents flash of unauthenticated content)
// 2. Dynamic language detection from cookies/headers
// Note: revalidate is not needed here (it's for ISR, not layouts)
export const dynamic = 'force-dynamic';

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

  return (
    <html dir={isRtl ? 'rtl' : 'ltr'} lang={language}>
      <body className={`relative w-full max-w-[100vw] overflow-x-hidden bg-gradient-to-b from-[#f5f5f5] to-[#fbfbfb] min-h-[100dvh] m-0 p-0 ${inter.className}`}>
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
