// Built-in imports
import { Inter } from 'next/font/google';

// Internal imports
import { Navbar } from '@/components/layout/navbar';
import { Header } from '@/components/ui/layout/header';
import { AuthProvider } from '@/providers/auth-provider';
import { ThemeProvider } from '@/providers/ThemeProvider';

// Types
import type { Metadata, Viewport } from 'next';

// Styles
import '@/styles/globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Ummah Flow',
    template: '%s | Ummah Flow',
  },
  description: 'Der erste halal-konforme Marktplatz für Muslime',
  keywords: ['halal', 'marktplatz', 'muslime', 'islam', 'shopping', 'e-commerce'],
  authors: [{ name: 'Ummah Flow Team' }],
  creator: 'Ummah Flow',
  publisher: 'Ummah Flow',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: '/',
    title: 'Ummah Flow - Von Muslimen für Muslime',
    description: 'Der erste halal-konforme Marktplatz',
    siteName: 'Ummah Flow',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ummah Flow - Von Muslimen für Muslime',
    description: 'Der erste halal-konforme Marktplatz',
    creator: '@ummahflow',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#589D96' },
    { media: '(prefers-color-scheme: dark)', color: '#BFDBD8' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning className={`${inter.variable} h-full`} lang="de">
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <link href="/manifest.json" rel="manifest" />
        <meta content="#000000" name="theme-color" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>
            <Navbar />
            <Header />
            <main className="min-h-[calc(100vh-90px)] pt-[90px]">{children}</main>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
