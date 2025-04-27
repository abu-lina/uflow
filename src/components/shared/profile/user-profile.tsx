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
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setUpdateSuccess(true);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  if (!user) {
    return <div className="py-10 text-center">You must be logged in to view this page.</div>;
  }

  return (
    <div className="mx-auto max-w-lg rounded-lg bg-white p-6 shadow-md">
      <h1 className="mb-6 text-2xl font-bold">Your Profile</h1>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-red-600">{error}</div>}

      {updateSuccess && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-green-600">
          Profile updated successfully!
        </div>
      )}

      <div className="mb-6 rounded-md bg-gray-50 p-4">
        <div className="mb-2">
          <span className="font-medium">Email:</span> {user.email}
        </div>
        <div className="mb-2">
          <span className="font-medium">User ID:</span>{' '}
          <span className="font-mono text-xs">{user.id}</span>
        </div>
        <div>
          <span className="font-medium">Last Sign In:</span>{' '}
          {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}
        </div>
      </div>

      <form className="mb-6" onSubmit={handleUpdateProfile}>
        <div className="mb-4">
          <label className="mb-2 block font-medium text-gray-700" htmlFor="fullName">
            Full Name
          </label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            id="fullName"
            placeholder="Enter your full name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <button
          className={`w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white ${
            updating ? 'cursor-not-allowed opacity-70' : 'hover:bg-blue-700'
          }`}
          disabled={updating}
          type="submit"
        >
          {updating ? 'Updating...' : 'Update Profile'}
        </button>
      </form>

      <div className="mt-6 border-t border-gray-200 pt-6">
        <button
          className="w-full rounded-md border border-red-500 px-4 py-2 font-medium text-red-500 hover:bg-red-50"
          onClick={() => signOut()}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
