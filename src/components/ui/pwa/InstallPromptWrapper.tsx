'use client';

import dynamic from 'next/dynamic';

const InstallPrompt = dynamic(
  () => import('./pwa-install-prompt').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => null,
  }
);

export default function InstallPromptWrapper() {
  return <InstallPrompt />;
} 