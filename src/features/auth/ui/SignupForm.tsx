'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function SignupForm() {
  const { loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else setSuccess('Check your email for a confirmation link!');
  };

  return (
    <form onSubmit={handleSignup} className="space-y-4">
      <input
        id="email"
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full border rounded px-3 py-2"
      />
      <input
        id="password"
        type="password"
        required
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full border rounded px-3 py-2"
      />
      {error && <div className="text-red-600">{error}</div>}
      {success && <div className="text-green-600">{success}</div>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 text-white py-2 rounded"
      >
        {loading ? 'Signing up...' : 'Sign up'}
      </button>
    </form>
  );
} 