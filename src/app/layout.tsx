// External dependencies
import { Inter } from 'next/font/google';
import Script from 'next/script';

import { Header } from '@/components/layout/Header';
import { RootClientLayout } from '@/components/layout/RootClientLayout';
import { ClientProviders } from '@/components/layout/ClientProviders';
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

export const metadata: Metadata = generateLocalizedMetadata('de', siteUrl);

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const themeScript = `
    (function() {
      try {
        var theme = localStorage.getItem('uflow-theme') || 'default';
        document.documentElement.setAttribute('data-theme', theme);
      } catch (e) {}
    })();
  `;

  return (
    <html suppressHydrationWarning dir="ltr" lang="de" style={{ backgroundColor: '#f5f5f5' }}>
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
        {/* Plausible Analytics — cookie-free, GDPR-compliant (Plan 035 M1) */}
        {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <Script
            defer
            data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            id="plausible-analytics"
            src={`${process.env.NEXT_PUBLIC_PLAUSIBLE_HOST || 'https://plausible.io'}/js/script.js`}
            strategy="afterInteractive"
          />
        )}
        <ClientProviders initialUser={null}>
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
