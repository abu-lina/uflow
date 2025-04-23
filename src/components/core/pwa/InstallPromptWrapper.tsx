'use client';

import dynamic from 'next/dynamic';

// Dynamically import the InstallPrompt component
const InstallPrompt = dynamic(() => import('@/components/PWAInstallPrompt'), {
  ssr: false,
});

export default function InstallPromptWrapper() {
  return <InstallPrompt />;
} 