'use client';
/* eslint-disable react/no-unescaped-entities */

import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import Link from 'next/link';

export default function AuthDebugPage() {
  const { user, isLoading, userRole, hasRole, supabase, session } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };
  
  const checkDirectRole = async () => {
    if (!user) {
      addLog('No user logged in');
      return;
    }
    
    try {
      addLog('Checking role directly from database...');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (error) {
        addLog(`Error checking role: ${error.message}`);
        return;
      }
      
      addLog(`Found user record: ${JSON.stringify(data)}`);
    } catch (error) {
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  const createUserWithRole = async () => {
    if (!user) {
      addLog('No user logged in');
      return;
    }
    
    try {
      addLog('Attempting to create/update user with service_owner role...');
      const { data, error } = await supabase
        .from('users')
        .upsert({
          user_id: user.id,
          email: user.email,
          role: 'service_owner'
        })
        .select()
        .single();
        
      if (error) {
        addLog(`Error setting role: ${error.message}`);
        return;
      }
      
      addLog(`Successfully set role: ${JSON.stringify(data)}`);
      addLog('Please refresh the page to see updated role');
    } catch (error) {
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  const clearLogs = () => setLogs([]);
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Authentication Debug</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Auth State</h2>
          
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin h-5 w-5 mr-3 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
              <p>Loading auth state...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p><strong>Logged in:</strong> {user ? 'Yes' : 'No'}</p>
              {user && (
                <>
                  <p><strong>User ID:</strong> {user.id}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Role:</strong> {userRole || 'No role set'}</p>
                  <p><strong>Is Service Owner:</strong> {hasRole('service_owner') ? 'Yes' : 'No'}</p>
                  <p><strong>Is Admin:</strong> {hasRole('admin') ? 'Yes' : 'No'}</p>
                  <p><strong>Session Active:</strong> {session ? 'Yes' : 'No'}</p>
                </>
              )}
            </div>
          )}
          
          <div className="mt-6 space-y-2">
            <h3 className="font-medium">Actions</h3>
            <div className="flex flex-col gap-2">
              <button 
                onClick={checkDirectRole}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                disabled={!user || isLoading}
              >
                Check Role Directly
              </button>
              
              <button 
                onClick={createUserWithRole}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
                disabled={!user || isLoading}
              >
                Set Service Owner Role
              </button>
              
              <Link 
                href="/services/create"
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition text-center"
              >
                Go to Create Service
              </Link>
              
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Debug Logs</h2>
            <button 
              onClick={clearLogs}
              className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm"
            >
              Clear
            </button>
          </div>
          
          <div className="bg-gray-100 p-4 rounded h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet. Try performing an action.</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Troubleshooting Steps</h2>
        
        <ol className="list-decimal pl-6 space-y-2">
          <li>Check if you're logged in and have a valid session</li>
          <li>Click "Check Role Directly" to query the database for your role</li>
          <li>If you don't have a role or it's not "service_owner", click "Set Service Owner Role"</li>
          <li>Refresh the page to see the updated role</li>
          <li>Try going to Create Service page again</li>
          <li>If issues persist, check browser console for errors</li>
        </ol>
      </div>
      
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h3>Important Debug Notes</h3>
        <p>
          If you see a blank role or &apos;undefined&apos; role, this means your user record likely exists in auth.users but not 
          in the public.users table with the &quot;role&quot; column. This can happen for various reasons:
        </p>
        <p>
          1. Your role record wasn&apos;t created when you signed up. Check your &quot;on auth.user&quot; trigger functions 
          to ensure they&apos;re working correctly. You may need to fix the functions or run a SQL query like &quot;INSERT INTO 
          public.users (id, role) VALUES (&apos;your-auth-id&apos;, &quot;service_owner&quot;)&quot; to manually create the record.
        </p>
      </div>
    </div>
  );
} 