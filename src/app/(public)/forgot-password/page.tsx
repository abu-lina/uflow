import { Suspense } from 'react';
import { ForgotPasswordPageContent } from './ForgotPasswordPageContent';

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordPageContent />
    </Suspense>
  );
}
