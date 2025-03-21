'use client';

import { useState, useEffect } from 'react';
import { supabase, checkConnection } from '@/lib/supabase';

export default function SupabaseConnectionTest() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'failed'>('checking');
  const [error, setError] = useState<string | null>(null);
  const [databaseTime, setDatabaseTime] = useState<string | null>(null);

  useEffect(() => {
    async function verifyConnection() {
      try {
        // First check basic connection
        const isConnected = await checkConnection();
        
        if (!isConnected) {
          setConnectionStatus('failed');
          setError('Failed to connect to Supabase');
          return;
        }

        // If basic connection works, try to get the current server timestamp
        const { data, error } = await supabase.rpc('get_current_timestamp');
        
        if (error) {
          setConnectionStatus('failed');
          setError(`Connected but RPC failed: ${error.message}`);
          return;
        }

        setDatabaseTime(data);
        setConnectionStatus('connected');
      } catch (err) {
        setConnectionStatus('failed');
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      }
    }

    verifyConnection();
  }, []);

  return (
    <div className="p-6 max-w-sm mx-auto bg-white rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-4">Supabase Connection Test</h2>
      
      <div className="mb-4">
        <div className="font-medium">Connection Status:</div>
        <div className={`
          ${connectionStatus === 'checking' && 'text-yellow-500'}
          ${connectionStatus === 'connected' && 'text-green-500'}
          ${connectionStatus === 'failed' && 'text-red-500'}
          font-bold
        `}>
          {connectionStatus === 'checking' && 'Checking...'}
          {connectionStatus === 'connected' && 'Connected! ✅'}
          {connectionStatus === 'failed' && 'Failed! ❌'}
        </div>
      </div>

      {databaseTime && (
        <div className="mb-4">
          <div className="font-medium">Database Time:</div>
          <div>{databaseTime}</div>
        </div>
      )}

      {error && (
        <div className="mb-4">
          <div className="font-medium text-red-500">Error:</div>
          <div className="text-sm break-all">{error}</div>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-500">
        <p>Check your console for more detailed information.</p>
      </div>
    </div>
  );
} 