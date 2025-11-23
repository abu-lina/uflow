'use client';

import Link from 'next/link';
import { useLanguage } from '@/providers/LanguageProvider';

export function DesktopFooter() {
  const { t } = useLanguage();

  return (
    <footer className="hidden md:block border-t border-gray-200 bg-white mt-auto">
      <div className="mx-auto w-full max-w-7xl px-4 py-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          {/* Copyright */}
          <div className="text-sm text-gray-600">
            © {new Date().getFullYear()} Ummah Flow. All rights reserved.
          </div>

          {/* Legal Links */}
          <div className="flex items-center gap-6 text-sm">
            <Link
              className="text-gray-600 hover:text-[#589D96] transition-colors"
              href="/privacy-policy"
            >
              {t('legal.privacyPolicy') || 'Privacy Policy'}
            </Link>
            <Link
              className="text-gray-600 hover:text-[#589D96] transition-colors"
              href="/terms"
            >
              {t('legal.termsOfService') || 'Terms of Service'}
            </Link>
            <Link
              className="text-gray-600 hover:text-[#589D96] transition-colors"
              href="/about"
            >
              {t('navigation.about') || 'About'}
            </Link>
          </div>

          {/* Contact */}
          <div className="text-sm text-gray-600">
            <a
              className="hover:text-[#589D96] transition-colors"
              href="mailto:support@ummahflow.com"
            >
              support@ummahflow.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
