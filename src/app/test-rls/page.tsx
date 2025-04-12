'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Define proper types for test results
interface TestResult {
  name: string;
  success: boolean;
  details: unknown;
}

export default function TestRLSPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  const addResult = (name: string, success: boolean, details: unknown) => {
    setResults((prev) => [...prev, { name, success, details }]);
  };

  const clearResults = () => {
    setResults([]);
  };

  // Test if anonymous users can read profiles
  const testAnonymousRead = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').limit(1);
      
      if (error) {
        addResult('Anonymous Read', false, { message: error.message, code: error.code });
        return;
      }
      
      addResult('Anonymous Read', true, { message: 'Anonymous users can read profiles', data });
    } catch (error) {
      addResult('Anonymous Read', false, error);
    }
  };

  // Test if anonymous users can update profiles (should fail with RLS)
  const testAnonymousUpdate = async () => {
    try {
      console.log("=== ANONYMOUS UPDATE TEST ===");
      console.log("Testing anonymous update...");
      
      // CRITICAL: First sign out to ensure we're truly anonymous
      await supabase.auth.signOut();
      console.log("Signed out to ensure anonymous state");
      
      // Debug API key (only showing first 10 chars for security)
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      console.log("API key prefix (first 10 chars):", anonKey.substring(0, 10) + '...');
      console.log("API key length:", anonKey.length);
      
      // Check if it's a JWT token (service roles are)
      if (anonKey.includes('.') && anonKey.split('.').length === 3) {
        try {
          // Try to decode the middle part of the JWT
          const payload = JSON.parse(atob(anonKey.split('.')[1]));
          console.log("JWT Token type:", payload.role || 'unknown');
          console.warn("ALERT: If role is 'service_role', this bypasses RLS completely!");
        } catch (e) {
          console.log("Not a standard JWT token", e);
        }
      }
      
      // Create a completely fresh client with explicit config
      const freshClient = createClientComponentClient();
      
      // Double check we're anonymous
      const { data: { session } } = await freshClient.auth.getSession();
      console.log("Verified auth state:", session ? "Still authenticated (problem!)" : "Anonymous (good)");
      
      if (session) {
        console.error("CRITICAL ERROR: Unable to test as anonymous - still authenticated after signOut!");
        addResult('Anonymous Update', false, { 
          message: 'Test failed: Unable to create anonymous state', 
          session: session.user.id
        });
        return;
      }
      
      // Test non-existent ID to avoid actually changing data
      const testId = '00000000-0000-0000-0000-000000000000';
      console.log("Testing update of profile ID:", testId);
      
      // Use direct fetch to bypass any potential Supabase client magic
      // This ensures we're making a truly anonymous request
      const postgrestUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${testId}`;
      console.log("Making direct fetch request to:", postgrestUrl);
      
      const response = await fetch(postgrestUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ full_name: 'Direct API test' })
      });
      
      console.log("Direct fetch response status:", response.status);
      
      // 401/403/400 statuses indicate permission denied (good)
      // 200/201/204 indicates success (bad - security issue)
      const responseBody = await response.text();
      console.log("Response body:", responseBody);
      
      if (response.ok) {
        console.error("SECURITY ISSUE: Anonymous update succeeded via direct API call!");
        addResult('Anonymous Update', false, { 
          message: 'SECURITY ISSUE: Anonymous users can update profiles!',
          status: response.status,
          body: responseBody
        });
      } else if (response.status === 401 || response.status === 403 || 
                (response.status === 400 && responseBody.includes('permission denied'))) {
        console.log("RLS correctly prevented update with status:", response.status);
        addResult('Anonymous Update', true, { 
          message: 'RLS correctly prevented anonymous update', 
          status: response.status,
          body: responseBody
        });
      } else {
        console.warn("Error occurred, but not clearly due to RLS:", response.status);
        addResult('Anonymous Update', false, { 
          message: 'Error occurred, but not clearly due to RLS', 
          status: response.status,
          body: responseBody
        });
      }
    } catch (error) {
      console.error("Exception during anonymous update test:", error);
      addResult('Anonymous Update', false, error);
    }
  };

  // Get the current user
  const getCurrentUser = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Test if authenticated users can update their own profile
  const testSelfUpdate = async () => {
    const user = await getCurrentUser();
    
    if (!user) {
      addResult('Self Update', false, { message: 'No authenticated user' });
      return;
    }
    
    try {
      // Try to update the user's own profile
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: `Test update at ${new Date().toISOString()}` })
        .eq('id', user.id);
      
      if (error) {
        addResult('Self Update', false, { 
          message: 'Unable to update own profile', 
          errorCode: error.code,
          errorMessage: error.message
        });
        return;
      }
      
      addResult('Self Update', true, { message: 'Successfully updated own profile' });
    } catch (error) {
      addResult('Self Update', false, error);
    }
  };

  // Test if authenticated users can update other users' profiles (should fail)
  const testOtherUpdate = async () => {
    const user = await getCurrentUser();
    
    if (!user) {
      addResult('Other User Update', false, { message: 'No authenticated user' });
      return;
    }
    
    try {
      // Try to update a different user's profile
      // Using a random UUID that's not the current user's ID
      const otherUserId = '00000000-0000-0000-0000-000000000000';
      
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: 'This should fail' })
        .eq('id', otherUserId);
      
      // If there's no error, that's a problem
      if (!error) {
        addResult('Other User Update', false, { 
          message: 'SECURITY ISSUE: Users can update other profiles!' 
        });
        return;
      }
      
      // If there's a permission error, that's good
      if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
        addResult('Other User Update', true, { 
          message: 'RLS correctly prevented updating other user', 
          errorCode: error.code,
          errorMessage: error.message
        });
      } else {
        // Some other error occurred
        addResult('Other User Update', false, { 
          message: 'Error occurred, but not due to RLS', 
          errorCode: error.code,
          errorMessage: error.message
        });
      }
    } catch (error) {
      addResult('Other User Update', false, error);
    }
  };

  // Run all tests
  const runTests = async () => {
    setLoading(true);
    clearResults();
    
    // Check authentication status first
    await getCurrentUser();
    
    // Run the tests
    await testAnonymousRead();
    await testAnonymousUpdate();
    
    if (userId) {
      await testSelfUpdate();
      await testOtherUpdate();
    }
    
    setLoading(false);
  };

  // Check auth status on load
  useEffect(() => {
    if (!loading) {
      getCurrentUser();
    }
  }, [loading, getCurrentUser]);

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">Test RLS Policies</h1>

      <div className="mb-6">
        <p className="mb-2">
          Auth Status: {userId ? (
            <>✅ Authenticated as <code className="bg-gray-100 px-1 py-0.5 rounded">{userId}</code></>
          ) : (
            <>❌ Not Authenticated</>
          )}
        </p>
        
        <div className="mt-4 flex gap-4">
          <button 
            onClick={runTests}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Run RLS Tests
          </button>
          
          <button 
            onClick={clearResults}
            disabled={loading || results.length === 0}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            Clear Results
          </button>
        </div>
      </div>
      
      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Test Results</h2>
          
          {results.map((result, index) => (
            <div 
              key={index} 
              className={`p-4 rounded ${
                result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                  {result.success ? '✅' : '❌'}
                </span>
                <h3 className="font-medium">{result.name}</h3>
              </div>
              
              <pre className="text-xs bg-white p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(result.details, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 