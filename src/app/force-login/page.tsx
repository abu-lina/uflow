'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

export default function ForceLoginPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user, session, userRole } = useAuth();
  const [status, setStatus] = useState('Checking authentication state...');
  const [working, setWorking] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAndFixAuth = async () => {
      setWorking(true);
      setStatus('Checking authentication...');

      try {
        // First verify the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          setStatus('Error getting session: ' + sessionError.message);
          return;
        }

        if (!session) {
          setStatus('No active session. Please log in first.');
          return;
        }

        setStatus('Session found. Checking user record...');

        // Check for user in the users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          setStatus('Error checking user: ' + userError.message);
          return;
        }

        // If user doesn't exist in the users table, create it
        if (!userData) {
          setStatus('User not found in users table. Creating...');
          
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([
              {
                user_id: session.user.id,
                email: session.user.email,
                role: 'service_owner',
              }
            ])
            .select()
            .single();

          if (insertError) {
            setStatus('Error creating user: ' + insertError.message);
            return;
          }

          setStatus('User created successfully with role: service_owner');
        } else {
          // If user exists but doesn't have the right role
          if (userData.role !== 'service_owner') {
            setStatus('Updating user role to service_owner...');
            
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { data: updatedUser, error: updateError } = await supabase
              .from('users')
              .update({ role: 'service_owner' })
              .eq('user_id', session.user.id)
              .select()
              .single();

            if (updateError) {
              setStatus('Error updating role: ' + updateError.message);
              return;
            }

            setStatus('Role updated successfully to service_owner');
          } else {
            setStatus('User already has service_owner role');
          }
        }

        // Final verification
        setStatus('Verifying changes...');
        const { data: finalCheck, error: finalError } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (finalError) {
          setStatus('Final verification error: ' + finalError.message);
          return;
        }

        setStatus(`Success! User has role: ${finalCheck.role}`);
        
        // Success! Set a timeout to redirect
        setTimeout(() => {
          router.push('/services/create');
        }, 3000);

      } catch (error) {
        setStatus('Unexpected error: ' + (error instanceof Error ? error.message : String(error)));
      } finally {
        setWorking(false);
      }
    };

    checkAndFixAuth();
  }, [router]);

  return (
    <div className="container mx-auto p-8 text-center">
      <h1 className="text-3xl font-bold mb-6">Force Login & Role Fix</h1>
      
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
        <div className="mb-4 flex items-center justify-center">
          {working ? (
            <div className="animate-spin h-8 w-8 mr-3 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
          ) : (
            status.includes('Success') ? (
              <div className="text-green-500 text-5xl mb-2">✓</div>
            ) : (
              <div className="text-blue-500 text-5xl mb-2">ℹ</div>
            )
          )}
        </div>
        
        <p className="text-gray-700 mb-4">{status}</p>
        
        {status.includes('Success') && (
          <p className="text-green-600">
            Redirecting to service creation page in 3 seconds...
          </p>
        )}
        
        {status.includes('No active session') && (
          <div className="mt-4">
            <button
              onClick={() => router.push('/auth/login?redirectTo=/force-login')}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
            >
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 