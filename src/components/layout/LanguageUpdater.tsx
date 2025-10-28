'use client';

import { useEffect } from 'react';
import { useLanguage } from '@/providers/LanguageProvider';

export function LanguageUpdater() {
  const { language } = useLanguage();

  useEffect(() => {
    // Update the HTML lang attribute
    document.documentElement.lang = language;
  }, [language]);

  return null; // This component doesn't render anything
}