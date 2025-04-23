'use client';
/* eslint-disable react/no-unescaped-entities */

import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import Link from 'next/link';
import { PostgrestError } from '@supabase/supabase-js';

type LogEntry = {
  id: number;
  timestamp: string;
  message: string;
};

type ProfileData = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'customer' | 'business_owner' | 'halal_reviewer' | 'admin' | null;
  phone: string | null;
  bio: string | null;
  updated_at: string | null;
  created_at: string;
};

export default function AuthDebugPage() {
  const { user, isLoading, userRole, hasRole, supabase, session } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  
  const addLog = (message: string) => {
    setLogs(prev => [
      ...prev,
      {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        message
      }
    ]);
  };
  
  const checkDirectRole = async () => {
    if (!user) {
      addLog('No user logged in');
      return;
    }
    
    try {
      setIsActionLoading(true);
      addLog('Checking role directly from database...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          addLog('No profile record found in the profiles table');
        } else {
          throw error;
        }
        return;
      }
      
      setProfileData(data);
      addLog(`Found profile record: ${JSON.stringify(data)}`);
      
    } catch (error) {
      const message = error instanceof PostgrestError ? error.message : String(error);
      addLog(`Error: ${message}`);
    } finally {
      setIsActionLoading(false);
    }
  };
  
  const createUserWithRole = async () => {
    if (!user) {
      addLog('No user logged in');
      return;
    }
    
    try {
      setIsActionLoading(true);
      addLog('Attempting to create/update profile with business_owner role...');
      
      // Check if profile exists
      const { data: existingProfile, error: existingError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (existingError && existingError.code !== 'PGRST116') {
        throw existingError;
      }
      
      let result;
      if (existingProfile) {
        // Update existing profile
        result = await supabase
          .from('profiles')
          .update({ 
            role: 'business_owner',
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
          .select()
          .single();
      } else {
        // Create new profile
        result = await supabase
          .from('profiles')
          .insert([
            {
              id: user.id,
              email: user.email,
              role: 'business_owner',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
          .select()
          .single();
      }
      
      if (result.error) {
        throw result.error;
      }
      
      setProfileData(result.data);
      addLog(`Successfully ${existingProfile ? 'updated' : 'created'} profile with role: ${result.data.role}`);
      addLog('Please refresh the page to see updated role');
      
    } catch (error) {
      const message = error instanceof PostgrestError ? error.message : String(error);
      addLog(`Error: ${message}`);
    } finally {
      setIsActionLoading(false);
    }
  };
  
  const fetchProfileData = async () => {
    if (!user) {
      addLog('No user logged in');
      return;
    }
    
    try {
      setIsActionLoading(true);
      addLog('Fetching profile data...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) {
        throw error;
      }
      
      setProfileData(data);
      addLog('Successfully fetched profile data');
      
    } catch (error) {
      const message = error instanceof PostgrestError ? error.message : String(error);
      addLog(`Error fetching profile: ${message}`);
    } finally {
      setIsActionLoading(false);
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
              <div className="flex items-center space-x-2">
                <span className="font-medium">Status:</span>
                <span className={`px-2 py-1 rounded-full text-sm ${
                  user ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {user ? 'Logged in' : 'Not logged in'}
                </span>
              </div>
              
              {user && (
                <>
                  <p><span className="font-medium">User ID:</span> {user.id}</p>
                  <p><span className="font-medium">Email:</span> {user.email}</p>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Role:</span>
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      userRole ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {userRole || 'No role set'}
                    </span>
                  </div>
                  <p><span className="font-medium">Is Business Owner:</span> {hasRole('business_owner') ? '✅' : '❌'}</p>
                  <p><span className="font-medium">Is Admin:</span> {hasRole('admin') ? '✅' : '❌'}</p>
                  <p><span className="font-medium">Session Active:</span> {session ? '✅' : '❌'}</p>
                  
                  {profileData && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-medium mb-2">Profile Data</h3>
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium">Full Name:</span> {profileData.full_name || 'Not set'}</p>
                        <p><span className="font-medium">Avatar URL:</span> {profileData.avatar_url || 'Not set'}</p>
                        <p><span className="font-medium">Role:</span> {profileData.role || 'Not set'}</p>
                        <p><span className="font-medium">Phone:</span> {profileData.phone || 'Not set'}</p>
                        <p><span className="font-medium">Bio:</span> {profileData.bio || 'Not set'}</p>
                        <p><span className="font-medium">Created:</span> {new Date(profileData.created_at).toLocaleString()}</p>
                        <p><span className="font-medium">Updated:</span> {profileData.updated_at ? new Date(profileData.updated_at).toLocaleString() : 'Never'}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          <div className="mt-6 space-y-2">
            <h3 className="font-medium">Actions</h3>
            <div className="flex flex-col gap-2">
              <button 
                onClick={checkDirectRole}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                disabled={!user || isLoading || isActionLoading}
              >
                {isActionLoading ? (
                  <><span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>Checking...</>
                ) : (
                  'Check Profile Data'
                )}
              </button>
              
              <button 
                onClick={createUserWithRole}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                disabled={!user || isLoading || isActionLoading}
              >
                {isActionLoading ? (
                  <><span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>Setting Role...</>
                ) : (
                  'Set Business Owner Role'
                )}
              </button>
              
              <button 
                onClick={fetchProfileData}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                disabled={!user || isLoading || isActionLoading}
              >
                {isActionLoading ? (
                  <><span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-white rounded-full"></span>Fetching Profile...</>
                ) : (
                  'Refresh Profile Data'
                )}
              </button>
              
              <Link 
                href="/services/create"
                className={`px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition text-center ${
                  (isLoading || !user) ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                }`}
              >
                Go to Create Service
              </Link>
              
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isActionLoading}
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
              className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={logs.length === 0}
            >
              Clear
            </button>
          </div>
          
          <div className="bg-gray-100 p-4 rounded h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet. Try performing an action.</p>
            ) : (
              logs.map(({ id, timestamp, message }) => (
                <div key={id} className="mb-1">
                  <span className="text-gray-500">{new Date(timestamp).toLocaleTimeString()}</span>: {message}
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
          <li>Click "Check Profile Data" to query your profile information</li>
          <li>If you don't have a role or it's not "business_owner", click "Set Business Owner Role"</li>
          <li>Click "Refresh Profile Data" to verify the changes</li>
          <li>Refresh the page to see the updated role in the auth context</li>
          <li>Try going to Create Service page again</li>
          <li>If issues persist, check browser console for errors</li>
        </ol>
      </div>
      
      <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4">Important Debug Notes</h3>
        <div className="space-y-4 text-gray-600">
          <p>
            If you see a blank role or 'undefined' role, this means your profile record might not exist in the profiles table
            or the role field is not set. This can happen for various reasons:
          </p>
          <ol className="list-decimal pl-6 space-y-2">
            <li>
              Your profile record wasn't created when you signed up. Check your "on auth.user" trigger functions 
              to ensure they're working correctly.
            </li>
            <li>
              The role field in your profile might not be set. Use the "Set Business Owner Role" button to 
              create or update your profile with the correct role.
            </li>
            <li>
              After updating your role, you may need to refresh the page to see the changes reflected in the
              auth context.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
} 