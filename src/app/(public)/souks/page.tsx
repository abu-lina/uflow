import { Suspense } from 'react';

import { SouksContent } from './SouksContent';

export default function SouksPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-screen-xl py-8">
          <div className="text-uFlowText font-inter-tight text-xl">Loading...</div>
        </div>
      }
    >
      <SouksContent />
    </Suspense>
  );
}
