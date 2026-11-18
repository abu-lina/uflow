'use client';

import Link from 'next/link';
import { useLanguage } from '@/providers/LanguageProvider';

export function DesktopFooter() {
  const { t } = useLanguage();

  return (
    <footer className="relative z-10 mt-auto hidden border-t border-border bg-background md:block">
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          {/* Copyright */}
          <div className="text-sm text-content-muted">
            © {new Date().getFullYear()} Ummah Flow. All rights reserved.
          </div>

          {/* Legal Links */}
          <div className="flex items-center gap-6 text-sm">
            <Link
              className="text-content-muted transition-colors hover:text-primary"
              href="/privacy-policy"
            >
              {t('legal.privacyPolicy') || 'Privacy Policy'}
            </Link>
            <Link className="text-content-muted transition-colors hover:text-primary" href="/terms">
              {t('legal.termsOfService') || 'Terms of Service'}
            </Link>
            <Link
              className="text-content-muted transition-colors hover:text-primary"
              href="/impressum"
            >
              {t('legal.impressum') || 'Impressum'}
            </Link>
            <Link className="text-content-muted transition-colors hover:text-primary" href="/about">
              {t('navigation.about') || 'About'}
            </Link>
          </div>

          {/* Contact */}
          <div className="text-sm text-content-muted">
            <a className="transition-colors hover:text-primary" href="mailto:support@ummahflow.com">
              support@ummahflow.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
