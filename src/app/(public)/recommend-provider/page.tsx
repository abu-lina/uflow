'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFormData } from '@/providers/form-provider';

export default function RecommendProviderPage() {
  const router = useRouter();
  const { setCreationMode } = useFormData();
  const hasRun = useRef(false);

  useEffect(() => {
    // Prevent double execution in development (React 18 strict mode)
    if (hasRun.current) return;
    hasRun.current = true;
    
    // Set the creation mode to 'recommendation'
    setCreationMode('recommendation');
    
    // Redirect to the streamlined recommendation form
    router.replace('/create/recommend');
  }, [setCreationMode, router]);

  // Show a loading state while redirecting
  return (
    <div className="flex h-screen items-center justify-center">
      <span className="text-lg text-gray-500">
        Weiterleitung...
      </span>
    </div>
  );
}

