'use client';

import { CloseButton } from '@/features/auth/components/CloseButton';
import { SigninForm } from '@/features/auth/components/SigninForm';
import { SigninIllustration } from '@/features/auth/components/SigninIllustration';

export default function SigninPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left Section - Illustration */}
      <div className="to-mint-dark flex w-1/2 items-center justify-center bg-gradient-to-br from-mint">
        <SigninIllustration />
      </div>

      {/* Right Section - Form */}
      <div className="relative flex w-1/2 items-center justify-center bg-white">
        <CloseButton />
        <SigninForm />
      </div>
    </div>
  );
}
