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
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/30fa8616-f6d4-485d-8046-9dc6cf35c029',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recommend-provider/page.tsx:18',message:'Setting creation mode to recommendation',data:{mode:'recommendation'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Set the creation mode to 'recommendation'
    setCreationMode('recommendation');
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/30fa8616-f6d4-485d-8046-9dc6cf35c029',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recommend-provider/page.tsx:22',message:'Calling router.replace to /create/basics',data:{target:'/create/basics'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // Redirect to the basics form (use replace to avoid adding to history)
    router.replace('/create/basics');
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

