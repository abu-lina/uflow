'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { toast } from 'sonner';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase/client';

export function LoginForm() {
  const router = useRouter();
  const { loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    console.log('Attempting login with:', { email });
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log('Login response:', { data, error });
    
    if (error) {
      setError(error.message);
      toast.error('Login failed: ' + error.message);
      return;
    }

    if (data?.user) {
      toast.success('Welcome back, ' + data.user.user_metadata.full_name);
      router.push('/dashboard');
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleLogin}>
      <input
        required
        className="w-full border rounded px-3 py-2"
        id="email"
        placeholder="Email"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <input
        required
        className="w-full border rounded px-3 py-2"
        id="password"
        placeholder="Password"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      {error && <div className="text-red-600">{error}</div>}
      <button
        className="w-full bg-blue-600 text-white py-2 rounded"
        disabled={loading}
        type="submit"
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
} 