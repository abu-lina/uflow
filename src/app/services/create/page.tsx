'use client';

import { useAuth } from '@/context/AuthContext';
import ServiceForm from '@/components/ServiceForm';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function CreateServicePage() {
  const { user, isLoading, userRole, hasRole, supabase } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const [directRoleCheck, setDirectRoleCheck] = useState<string | null>(null);
  const [contextRoleCheck, setContextRoleCheck] = useState<string | null>(null);
  
  // Direct database check for role bypassing context
  useEffect(() => {
    if (user && !isLoading) {
      const checkRoleDirectly = async () => {
        try {
          // Try first with user_id field
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('user_id', user.id)
            .single();
            
          if (!userError && userData) {
            console.log('Direct role check by user_id succeeded:', userData.role);
            setDirectRoleCheck(userData.role);
            if (userData.role === 'service_owner' || userData.role === 'admin') {
              setAuthorized(true);
            }
            return;
          }
          
          // Fallback to id field
          const { data: userDataById, error: userErrorById } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();
            
          if (!userErrorById && userDataById) {
            console.log('Direct role check by id succeeded:', userDataById.role);
            setDirectRoleCheck(userDataById.role);
            if (userDataById.role === 'service_owner' || userDataById.role === 'admin') {
              setAuthorized(true);
            }
          } else {
            console.error('Both direct role checks failed');
          }
        } catch (err) {
          console.error('Error in direct role check:', err);
        }
      };
      
      checkRoleDirectly();
    }
  }, [user, isLoading, supabase]);
  
  // Also check using context
  useEffect(() => {
    if (!isLoading && user) {
      if (hasRole(['service_owner', 'admin'])) {
        setAuthorized(true);
      } else {
        console.log('User does not have required role from context:', userRole);
      }
      // Set the context role check state
      setContextRoleCheck(userRole);
    }
  }, [user, isLoading, hasRole, userRole]);
  
  // Show simplified loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-10 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }
  
  // Check if user is logged in
  if (!user) {
    return (
      <div className="container mx-auto py-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
        <p className="text-gray-600 mb-6">You need to be logged in to create a service.</p>
        <Link 
          href="/auth/login?redirectTo=/services/create"
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition"
        >
          Sign In
        </Link>
      </div>
    );
  }
  
  // Check if user has proper role
  if (!authorized) {
    return (
      <div className="container mx-auto py-10 text-center">
        <h1 className="text-2xl font-bold mb-4">Service Owner Role Required</h1>
        <p className="text-gray-600 mb-6">
          You need to have a service owner role to create services.
          <span className="block mt-2">Context Role: <strong>{userRole || 'none'}</strong></span>
          <span className="block mt-2">Direct Database Role: <strong>{directRoleCheck || 'none'}</strong></span>
        </p>
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-md mb-6 max-w-lg mx-auto text-left">
          <p className="text-amber-800 mb-2">If your role doesn&apos;t match, try these steps:</p>
          <ol className="list-decimal pl-6 text-amber-800">
            <li>Visit the <Link href="/auth-check" className="underline">auth check page</Link></li>
            <li>Click the &quot;Set Role to Service Owner&quot; button</li>
            <li>Return to this page</li>
          </ol>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/services"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition"
          >
            Browse Services
          </Link>
          <Link 
            href="/auth-check"
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
          >
            Check Auth & Fix Role
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
  
  // Context Role Info
  if (directRoleCheck !== contextRoleCheck) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
        <h3 className="font-medium text-yellow-800">Role Mismatch Detected</h3>
        <p className="text-sm text-yellow-700 mt-2">
          There&apos;s a difference between your direct database role and the role from the context:
        </p>
        <ul className="list-disc list-inside mt-2 text-sm text-yellow-700">
          <li>Direct database check: <span className="font-medium">{directRoleCheck || "not found"}</span></li>
          <li>Context check: <span className="font-medium">{contextRoleCheck || "not found"}</span></li>
        </ul>
        <p className="text-sm text-yellow-700 mt-2">
          Try refreshing the page or logging out and back in to resolve this issue.
        </p>
      </div>
    );
  }
  
  // User is authorized, show the form
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Create New Service</h1>
      <ServiceForm />
    </div>
  );
} 