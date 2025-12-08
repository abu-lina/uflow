import { Inter } from 'next/font/google';
import { Header } from '@/components/layout/Header';
import { ClientProviders } from '@/components/layout/ClientProviders';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import '@/styles/globals.css';
import type { Metadata } from 'next';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: 'Next.js + Supabase Starter',
  description: 'A production-ready Next.js 15 starter with Supabase authentication',
};

export const dynamic = 'force-dynamic';

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  let user = null;
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    user = session?.user ?? null;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Layout session check failed:', error);
    }
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientProviders initialUser={user}>
          <Header />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        </ClientProviders>
      </body>
    </html>
  );
}





