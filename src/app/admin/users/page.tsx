'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

type User = {
  id?: string;
  user_id?: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
};

export default function AdminUsersPage() {
  const { user, supabase, isLoading: authLoading, userRole } = useAuth();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<string>('');

  // Check if user has admin role
  const isAdmin = userRole === 'admin';

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!user || !isAdmin) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching users:', error);
          setError('Failed to load users. Please try again.');
          return;
        }
        
        setUsers(data || []);
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (!authLoading) {
      fetchUsers();
    }
  }, [user, supabase, authLoading, isAdmin, userRole]);

  // Handle role update
  const handleRoleUpdate = async () => {
    if (!editingUser || !newRole) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq(editingUser.user_id ? 'user_id' : 'id', editingUser.user_id || editingUser.id);
        
      if (error) {
        console.error('Error updating user role:', error);
        toast.error('Failed to update user role');
        return;
      }
      
      // Update local state
      setUsers(users.map(u => {
        if ((u.user_id && u.user_id === editingUser.user_id) || (u.id && u.id === editingUser.id)) {
          return { ...u, role: newRole };
        }
        return u;
      }));
      
      toast.success('User role updated successfully');
      setEditingUser(null);
      setNewRole('');
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('An unexpected error occurred');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-2">Loading users...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">You must be logged in to access the admin panel</p>
        <button
          onClick={() => router.push('/auth/login?redirectTo=/admin/users')}
          className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">You need administrator permissions to access this page</p>
        <p className="text-sm text-gray-500">Your current role: {userRole || 'none'}</p>
        <p className="text-sm text-gray-500 mt-2">Please contact the admin if you believe this is an error.</p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
        >
          Go to Homepage
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">User Management</h1>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
          {error}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">All Users</h2>
          
          {users.length === 0 ? (
            <p className="text-gray-500">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.user_id || user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                          user.role === 'halal_reviewer' ? 'bg-green-100 text-green-800' : 
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role || 'No role'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 truncate max-w-[150px]" title={user.user_id || user.id}>
                          {user.user_id || user.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setNewRole(user.role || '');
                          }}
                          className="text-primary hover:text-primary-dark"
                        >
                          Edit Role
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit User Role</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">User: {editingUser.email}</p>
              <p className="text-sm text-gray-600">Current Role: {editingUser.role || 'None'}</p>
            </div>
            
            <div className="mb-4">
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                New Role
              </label>
              <select
                id="role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              >
                <option value="">Select role...</option>
                <option value="service_owner">Service Owner</option>
                <option value="halal_reviewer">Halal Reviewer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setEditingUser(null);
                  setNewRole('');
                }}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleUpdate}
                disabled={!newRole}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 