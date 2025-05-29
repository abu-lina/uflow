'use client';

import { useState } from 'react';

import { SigninModal } from './SigninModal';
import { SignupModal } from './SignupModal';

type AuthMode = 'signin' | 'signup';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

export function AuthModal({ isOpen, onClose, initialMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  if (!isOpen) {
    return null;
  }

  return mode === 'signin' ? (
    <SigninModal onClose={onClose} onSwitchMode={() => setMode('signup')} />
  ) : (
    <SignupModal onClose={onClose} onSwitchMode={() => setMode('signin')} />
  );
}
