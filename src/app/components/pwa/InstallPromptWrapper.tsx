'use client';

import dynamic from 'next/dynamic';

// Dynamically import the InstallPrompt component
const InstallPrompt = dynamic(() => import('./InstallPrompt'), {
  ssr: false,
});

export default function InstallPromptWrapper() {
  return <InstallPrompt />;
} 