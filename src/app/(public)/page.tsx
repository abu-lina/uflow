"use client";

import { useState } from 'react';

import { SignInPopup } from '@/features/auth/ui/SignInPopup';
import { SignupPopup } from '@/features/auth/ui/SignupPopup';

export default function HomePage() {
  const [showSignup, setShowSignup] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="mb-8 text-3xl font-bold">Welcome to Ummah Flow</h1>
      <div className="flex gap-4">
        <button
          className="px-6 py-3 bg-[#589D96] text-white rounded-lg font-semibold"
          onClick={() => setShowSignup(true)}
        >
          Sign Up
        </button>
        <button
          className="px-6 py-3 bg-white text-[#589D96] border border-[#589D96] rounded-lg font-semibold"
          onClick={() => setShowSignIn(true)}
        >
          Sign In
        </button>
      </div>
      {showSignup && (
        <SignupPopup onClose={() => setShowSignup(false)} />
      )}
      {showSignIn && (
        <SignInPopup onClose={() => setShowSignIn(false)} />
      )}
    </main>
  );
} 