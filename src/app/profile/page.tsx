'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

// Add this interface at the top of the file
interface ProfileData {
  id: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
  updated_at?: string;
  created_at?: string;
  [key: string]: string | undefined;
}

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const [sessionInfo, setSessionInfo] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  // Add this function in the component, before useEffect
  async function checkProfilesTable() {
    try {
      // Try to query the profiles table
      const { error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (error) {
        console.error('Error accessing profiles table:', error);
        console.error('You may need to run the SQL from src/sql/profiles-schema.sql in your Supabase SQL Editor');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Exception checking profiles table:', error);
      return false;
    }
  }

  useEffect(() => {
    async function initialize() {
      // First check if profiles table exists
      const tableExists = await checkProfilesTable();
      if (!tableExists) {
        setUpdateMessage({
          text: 'Database setup incomplete. Please run the SQL from src/sql/profiles-schema.sql in your Supabase SQL Editor.',
          type: 'error'
        });
        return;
      }
      
      console.log('Profile page loaded');
      console.log('User from context:', user);
      console.log('Is loading:', isLoading);
      
      // Direct check from Supabase as a backup
      async function checkSession() {
        const { data } = await supabase.auth.getSession();
        console.log('Direct session check:', data.session);
        if (data.session) {
          setSessionInfo(JSON.stringify(data.session.user, null, 2));
          
          // Set initial full name from user metadata if available
          if (data.session.user.user_metadata?.full_name) {
            setFullName(data.session.user.user_metadata.full_name);
          }
          
          // Also fetch data from profiles table
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .single();
          
          if (profileError) {
            if (profileError.code === 'PGRST116') { // No rows found
              console.log('No profile found, creating one...');
              
              // Create profile if it doesn't exist
              const { error: createError } = await supabase
                .from('profiles')
                .insert({
                  id: data.session.user.id,
                  email: data.session.user.email,
                  full_name: data.session.user.user_metadata?.full_name || '',
                  updated_at: new Date().toISOString()
                });
              
              if (createError) {
                console.error('Error creating profile:', createError);
              } else {
                console.log('Profile created successfully');
              }
            } else {
              console.error('Error fetching profile data:', profileError);
            }
          } else if (profileData) {
            console.log('Profile data from profiles table:', profileData);
            setProfileData(profileData);
            // Use profile data from table if available and no metadata
            if (profileData.full_name && !data.session.user.user_metadata?.full_name) {
              setFullName(profileData.full_name);
            }
          }
        }
      }
      
      checkSession();
    }
    
    initialize();
  }, [user, isLoading]);

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault();
    setIsUpdating(true);
    setUpdateMessage(null);
    
    if (!user) {
      console.error("No user found");
      setUpdateMessage({ text: 'Not logged in', type: 'error' });
      setIsUpdating(false);
      return;
    }
    
    try {
      // Update user metadata first
      console.log("Updating user metadata for:", user.id);
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });

      if (error) {
        console.error("Error updating user metadata:", error);
        setUpdateMessage({ text: 'Error updating profile: ' + error.message, type: 'error' });
        return;
      }

      // Then update profiles table
      console.log("Updating profiles table for user:", user.id, "with full_name:", fullName);
      const { error: profileError, data: profileData } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName,
          email: user.email,
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error("Error updating profiles table:", profileError);
        console.log("Error code:", profileError.code);
        console.log("Error message:", profileError.message);
        console.log("Error details:", profileError.details);
        
        setUpdateMessage({ 
          text: `Error updating profiles table: ${profileError.message || 'Unknown error'}`, 
          type: 'error' 
        });
        
        // Log a notification about possibly missing table
        if (profileError.code === '42P01') {
          console.error('Table "profiles" does not exist. Please run the SQL setup script.');
        }
        return;
      }

      console.log("Profile successfully updated");
      console.log("Profile data returned:", profileData);
      
      setUpdateMessage({ text: 'Profile updated successfully!', type: 'success' });
    } catch (error) {
      console.error("Exception in profile update:", error);
      setUpdateMessage({ 
        text: `Error updating profile: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        type: 'error' 
      });
    } finally {
      setIsUpdating(false);
    }
  }

  // Always render the profile content, regardless of auth state
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-6">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-2 text-center">User Profile</h1>
        <p className="mb-6 text-center text-gray-500">This page shows your profile information</p>
        
        {isLoading ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg">
            <p className="text-lg">Loading profile data...</p>
          </div>
        ) : user ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Your Information</h2>
              <div className="space-y-3">
                <p><span className="font-medium">Email:</span> {user.email}</p>
                <p><span className="font-medium">User ID:</span> <span className="text-xs font-mono">{user.id}</span></p>
                
                {user.user_metadata?.full_name && (
                  <p><span className="font-medium">Name (from Auth):</span> {user.user_metadata.full_name}</p>
                )}
                
                {profileData?.full_name && (
                  <p><span className="font-medium">Name (from Profiles table):</span> {profileData.full_name}</p>
                )}
                
                {profileData?.updated_at && (
                  <p><span className="font-medium">Last Updated:</span> {new Date(profileData.updated_at).toLocaleString()}</p>
                )}
              </div>
            </div>
            
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Edit Profile</h2>
              
              {updateMessage && (
                <div className={`p-3 mb-4 rounded-md ${
                  updateMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {updateMessage.text}
                </div>
              )}
              
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter your full name"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className={`w-full bg-emerald-600 text-white py-2 px-4 rounded-md ${
                    isUpdating ? 'opacity-70 cursor-not-allowed' : 'hover:bg-emerald-700'
                  }`}
                >
                  {isUpdating ? 'Updating...' : 'Update Profile'}
                </button>
              </form>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = '/';
                }}
                className="w-full bg-red-100 text-red-600 py-2 px-4 rounded-md hover:bg-red-200"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 text-yellow-800 rounded-lg p-6 text-center">
            <p className="mb-4">You are not currently signed in.</p>
            <div className="space-y-3">
              <p>Session check output was: {sessionInfo ? 'Session found' : 'No session found'}</p>
              <p>
                <Link href="/auth/login" className="bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 inline-block">
                  Go to Login
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
} 