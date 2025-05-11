'use client';

import { CloseButton } from '@/features/auth/components/CloseButton';
import { SignupForm } from '@/features/auth/components/SignupForm';
import { SignupIllustration } from '@/features/auth/components/SignupIllustration';

export default function SignupPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left Section - Illustration */}
      <div className="to-mint-dark flex w-1/2 items-center justify-center bg-gradient-to-br from-mint">
        <SignupIllustration />
      </div>

      {/* Right Section - Form */}
      <div className="relative flex w-1/2 items-center justify-center bg-white">
        <CloseButton />
        <SignupForm />
      </div>
    </div>
  );
}
