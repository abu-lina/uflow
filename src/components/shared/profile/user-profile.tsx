'use client';

import { useState } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';

export default function UserProfile() {
  const { user, signOut } = useAuth();
  const [fullName, setFullName] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setUpdating(true);
    setUpdateSuccess(false);
    setError(null);

    try {
      // Simulate profile update
      await new Promise(resolve => setTimeout(resolve, 1000));
      setUpdateSuccess(true);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  if (!user) {
    return <div className="text-center py-10">You must be logged in to view this page.</div>;
  }

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">Your Profile</h1>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {updateSuccess && (
        <div className="bg-green-50 text-green-600 p-3 rounded-md mb-4">
          Profile updated successfully!
        </div>
      )}
      
      <div className="mb-6 p-4 bg-gray-50 rounded-md">
        <div className="mb-2">
          <span className="font-medium">Email:</span> {user.email}
        </div>
        <div className="mb-2">
          <span className="font-medium">User ID:</span> <span className="text-xs font-mono">{user.id}</span>
        </div>
        <div>
          <span className="font-medium">Last Sign In:</span>{' '}
          {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}
        </div>
      </div>
      
      <form onSubmit={handleUpdateProfile} className="mb-6">
        <div className="mb-4">
          <label htmlFor="fullName" className="block text-gray-700 font-medium mb-2">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your full name"
          />
        </div>
        
        <button
          type="submit"
          disabled={updating}
          className={`w-full py-2 px-4 rounded-md bg-blue-600 text-white font-medium ${
            updating ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
          }`}
        >
          {updating ? 'Updating...' : 'Update Profile'}
        </button>
      </form>
      
      <div className="mt-6 pt-6 border-t border-gray-200">
        <button
          onClick={() => signOut()}
          className="w-full py-2 px-4 rounded-md border border-red-500 text-red-500 font-medium hover:bg-red-50"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
} 