'use client';
/* eslint-disable react/no-unescaped-entities */
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';

export default function AuthCheckPage() {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [authState, setAuthState] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [browserInfo, setBrowserInfo] = useState({
    userAgent: '',
    language: '',
    cookiesEnabled: false
  });
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // Create a fresh Supabase client
        const supabase = createClientComponentClient();
        
        // Get the session directly
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        let userData = null;
        let userRoleData = null;
        
        if (session) {
          // Get the user directly
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            throw userError;
          }
          
          userData = user;
          
          // If we have a user, check their role
          if (user) {
            // Try first with user_id field
            const { data: roleData, error: roleError } = await supabase
              .from('users')
              .select('role')
              .eq('user_id', user.id)
              .single();
              
            if (roleError && roleError.code !== 'PGRST116') {
              console.error('Role fetch error with user_id:', roleError);
              
              // Try with id field as fallback
              const { data: roleDataById, error: roleErrorById } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();
                
              if (roleErrorById && roleErrorById.code !== 'PGRST116') {
                console.error('Role fetch error with id:', roleErrorById);
              } else {
                userRoleData = roleDataById?.role;
              }
            } else {
              userRoleData = roleData?.role;
            }
          }
        }
        
        // Set all the info we gathered
        setAuthState({
          hasSession: !!session,
          session: session ? {
            id: session.access_token,
            expires_at: new Date(session.expires_at ? session.expires_at * 1000 : 0).toISOString(),
          } : null,
          user: userData ? {
            id: userData.id,
            email: userData.email,
            last_sign_in: userData.last_sign_in_at,
          } : null,
          role: userRoleData,
          timestamp: new Date().toISOString(),
          browserInfo: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            cookiesEnabled: navigator.cookieEnabled,
          }
        });
        
      } catch (err) {
        console.error('Auth check error:', err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Function to fix the user role directly
  const fixUserRole = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const supabase = createClientComponentClient();
      
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw userError;
      }
      
      if (!user) {
        throw new Error('No user logged in');
      }
      
      // Check if user exists with either user_id or id
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data: userById, error: errorById } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
        
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data: userByUserId, error: errorByUserId } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      const existingUser = userById || userByUserId;
      
      if (existingUser) {
        // User exists, update via the field that worked
        const updateField = userById ? 'id' : 'user_id';
        const { data, error } = await supabase
          .from('users')
          .update({ 
            role: 'service_owner',
            updated_at: new Date().toISOString()
          })
          .eq(updateField, user.id)
          .select()
          .single();
        
        if (error) {
          throw error;
        }
        
        alert(`Role updated successfully to: ${data.role}`);
      } else {
        // User doesn't exist in either field, create new entry with both fields set
        const { data, error } = await supabase
          .from('users')
          .insert([
            {
              id: user.id,
              user_id: user.id,
              email: user.email,
              role: 'service_owner',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
          .select()
          .single();
          
        if (error) {
          throw error;
        }
        
        alert(`User created successfully with role: ${data.role}`);
      }
      
      // Refresh the page to show the updated info
      window.location.reload();
      
    } catch (err) {
      console.error('Fix role error:', err);
      alert(`Error fixing role: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to logout and clear all auth state
  const clearAuthState = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const supabase = createClientComponentClient();
      await supabase.auth.signOut();
      alert('Successfully signed out. Auth state cleared.');
      window.location.href = '/auth/login';
    } catch (err) {
      console.error('Sign out error:', err);
      alert(`Error signing out: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Direct Authentication Check</h1>
      <p className="mb-4 text-gray-600">
        This page bypasses the AuthContext and directly checks your authentication status with Supabase.
      </p>
      
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin h-8 w-8 mr-3 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
          <p>Checking authentication state...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
          <p className="font-bold">Error checking authentication:</p>
          <p>{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Authentication State</h2>
            
            <div className="mb-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mr-2 mb-2 
                ${authState?.hasSession ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {authState?.hasSession ? 'Authenticated' : 'Not Authenticated'}
              </span>
              
              {authState?.role && (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mr-2 mb-2 
                  ${authState.role === 'service_owner' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                  Role: {authState.role}
                </span>
              )}
            </div>
            
            <div className="space-y-2 text-sm">
              {authState?.user ? (
                <>
                  <p><span className="font-medium">User ID:</span> {authState.user.id}</p>
                  <p><span className="font-medium">Email:</span> {authState.user.email}</p>
                  <p><span className="font-medium">Last Sign In:</span> {authState.user.last_sign_in || 'N/A'}</p>
                </>
              ) : (
                <p className="text-orange-600">No user data found</p>
              )}
              
              {authState?.session && (
                <>
                  <p className="mt-4 font-medium">Session Info:</p>
                  <p><span className="font-medium">Expires:</span> {authState.session.expires_at}</p>
                </>
              )}
              
              <p className="mt-4"><span className="font-medium">Checked at:</span> {authState?.timestamp}</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Actions</h2>
            
            <div className="space-y-4">
              <button
                onClick={fixUserRole}
                disabled={isLoading || !authState?.user}
                className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Set Role to Service Owner
              </button>
              
              <button
                onClick={clearAuthState}
                disabled={isLoading}
                className="w-full py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear Auth State & Logout
              </button>
              
              <button
                onClick={() => window.location.reload()}
                disabled={isLoading}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Refresh Page
              </button>
              
              <div className="mt-4 space-x-4">
                <button 
                  onClick={fixUserRole}
                  disabled={isLoading}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Force Create Role
                </button>
                <Link href="/services/create/" className="bg-blue-600 text-white px-4 py-2 rounded inline-block hover:bg-blue-700">
                  Go to Create
                </Link>
              </div>
            </div>
            
            <div className="mt-8">
              <h3 className="font-medium mb-2">Browser Information:</h3>
              <div className="space-y-1 text-xs text-gray-600">
                <p>User Agent: {authState?.browserInfo?.userAgent}</p>
                <p>Language: {authState?.browserInfo?.language}</p>
                <p>Cookies Enabled: {authState?.browserInfo?.cookiesEnabled ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-bold mb-4">Troubleshooting</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>If you see "Not Authenticated" but are logged in, your cookies may be misconfigured</li>
          <li>Try clearing browser cookies/storage and logging in again</li>
          <li>Check if there are any console errors related to Supabase or authentication</li>
          <li>Click "Set Role to Service Owner" to force update your role in the database</li>
          <li>If nothing works, try "Clear Auth State & Logout" and log in again</li>
        </ol>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>
          To debug this issue, you can check if the role is correctly set in the users table. If your ID is &quot;{authState?.user?.id}&quot;, 
          then your role should be set to &quot;service_owner&quot; in the users table.
        </p>
        <p className="mt-2">
          If your role is not set, you can try to set it manually using the &quot;Force Create Role&quot; button above, 
          or you can check the &quot;user_id&quot; vs &quot;id&quot; issue in your database.
        </p>
      </div>
    </div>
  );
} 