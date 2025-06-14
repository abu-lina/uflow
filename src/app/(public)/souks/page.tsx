import { Suspense } from 'react';

import { SouksContent } from './SouksContent';

export default function SouksPage() {
  return (
    <Suspense fallback={null}>
      <SouksContent />
    </Suspense>
  );
}
