'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function AuthDebugPage() {
  const router = useRouter();
  const { user, session } = useAuth();
  const [serverDiagnostic, setServerDiagnostic] = useState<Record<string, unknown> | null>(null);
  const [refreshResult, setRefreshResult] = useState<Record<string, unknown> | null>(null);
  const [syncResult, setSyncResult] = useState<Record<string, unknown> | null>(null);
  
  // Security: Only allow in development mode
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      router.replace('/');
    }
  }, [router]);

  // Don't render in production
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const checkServer = async () => {
    const res = await fetch('/api/admin/diagnose');
    const data = await res.json();
    setServerDiagnostic(data);
  };

  const refreshSession = async () => {
    const res = await fetch('/api/admin/refresh-session', { method: 'POST' });
    const data = await res.json();
    setRefreshResult(data);
  };

  const syncTokens = async () => {
    if (session?.access_token && session?.refresh_token) {
      const res = await fetch('/api/auth/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }),
      });
      const data = await res.json();
      setSyncResult(data);
    }
  };

  const forceRefresh = async () => {
    const { data, error } = await supabase.auth.refreshSession();
    console.log('Force refresh result:', { data, error });
    if (data.session) {
      // Sync the refreshed tokens
      await fetch('/api/auth/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }),
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold">Auth Diagnostic Tool</h1>

        {/* Client-side info */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Client-Side Status</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>
              <strong>User:</strong> {user ? `${user.email} (${user.id})` : 'Not logged in'}
            </div>
            <div>
              <strong>Has Session:</strong> {session ? 'Yes' : 'No'}
            </div>
            {session && (
              <>
                <div>
                  <strong>Access Token:</strong> {session.access_token?.substring(0, 20)}...
                </div>
                <div>
                  <strong>Token Length:</strong> {session.access_token?.length}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              onClick={checkServer}
            >
              Check Server Status
            </button>
            <button
              className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
              disabled={!session}
              onClick={syncTokens}
            >
              Sync Tokens to Server
            </button>
            <button
              className="rounded bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600"
              onClick={refreshSession}
            >
              Refresh Session (Server)
            </button>
            <button
              className="rounded bg-purple-500 px-4 py-2 text-white hover:bg-purple-600"
              onClick={forceRefresh}
            >
              Force Refresh (Client)
            </button>
            <a
              className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
              href="/dashboard"
            >
              Try Dashboard
            </a>
          </div>
        </div>

        {/* Server diagnostic result */}
        {serverDiagnostic && (
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">Server Diagnostic</h2>
            <pre className="overflow-auto rounded bg-gray-100 p-4 text-xs">
              {JSON.stringify(serverDiagnostic, null, 2)}
            </pre>
          </div>
        )}

        {/* Refresh result */}
        {refreshResult && (
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">Refresh Result</h2>
            <pre className="overflow-auto rounded bg-gray-100 p-4 text-xs">
              {JSON.stringify(refreshResult, null, 2)}
            </pre>
          </div>
        )}

        {/* Sync result */}
        {syncResult && (
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">Sync Result</h2>
            <pre className="overflow-auto rounded bg-gray-100 p-4 text-xs">
              {JSON.stringify(syncResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

