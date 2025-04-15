'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { Service as ServiceType } from '@/types/service';
import { Button } from "@/components/ui/button"

export default function ServiceReviewPage() {
  const { user, supabase, isLoading: authLoading, userRole } = useAuth();
  const router = useRouter();
  const params = useParams();
  const serviceId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [service, setService] = useState<ServiceType | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  // Check if user has the halal_reviewer role
  const isHalalReviewer = userRole === 'halal_reviewer' || userRole === 'admin';

  // Fetch service details
  useEffect(() => {
    const fetchServiceDetails = async () => {
      if (!user || !isHalalReviewer || !serviceId) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('services')
          .select(`
            service_id,
            service_owner_id,
            service_name,
            service_description,
            service_logo,
            is_verified,
            service_view_count,
            purchase_count,
            category_id,
            created_at,
            updated_at,
            contact_email,
            contact_phone,
            social_instagram,
            social_website,
            address_street,
            address_zip,
            address_country,
            location_latitude,
            location_longitude,
            service_status,
            users!services_service_owner_id_fkey1 (
              user_id,
              email
            ),
            categories (
              category_id,
              name_en
            )
          `)
          .eq('service_id', serviceId)
          .single();
          
        if (error) {
          console.error('Error fetching service details:', error);
          setError('Failed to load service details. Please try again.');
          return;
        }
        
        setService(data);
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (!authLoading) {
      fetchServiceDetails();
    }
  }, [user, supabase, authLoading, isHalalReviewer, serviceId, userRole]);

  // Handle approve/reject
  const handleReviewAction = async (action: 'approve' | 'reject') => {
    if (!service || !user) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      if (!feedback && action === 'reject') {
        toast.error('Please provide feedback for rejection');
        setIsSubmitting(false);
        return;
      }
      
      console.log('Submitting review action:', { 
        action, 
        serviceId: service.service_id,
        userId: user.id,
        userRole
      });
      
      // First try the normal API
      try {
        // Update the service via the API
        const response = await fetch('/api/reviewer/review-service', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            serviceId: service.service_id,
            action,
            feedback,
          }),
          credentials: 'include' // Ensure cookies are sent with the request
        });
        
        // Safe way to parse JSON with fallbacks
        let result;
        try {
          result = await response.json();
        } catch (parseError) {
          console.error('Failed to parse response:', parseError);
          result = { error: 'Failed to parse server response' };
        }
        
        // Check response status
        if (!response.ok) {
          // Handle API errors
          console.error('Error updating service:', result);
          let errorMessage = result.error || 'Failed to update service';
          
          // Handle specific error cases
          if (response.status === 401) {
            errorMessage = 'Authentication error: Please try the Direct Approve button';
            toast.error('Session may have expired');
          } else if (response.status === 403) {
            errorMessage = `Permission denied: Your current role (${userRole}) doesn't have reviewer permissions`;
          } else if (response.status === 404) {
            errorMessage = 'User profile not found. Please visit your profile page to complete setup.';
          }
          
          setError(`${errorMessage}${result.details ? ` - ${result.details}` : ''}`);
          toast.error('Failed to update service. Try the Direct Approve button instead.');
          return;
        }
        
        // Success case
        toast.success(action === 'approve' ? 'Service approved successfully' : 'Service rejected');
        router.push('/reviewer/dashboard');
        return;
      } catch (apiErr) {
        console.error('API Error:', apiErr);
        setError('Network error contacting the API. Try the Direct Approve button instead.');
        toast.error('API request failed');
      }
    } catch (outerErr) {
      console.error('Unexpected error:', outerErr);
      setError('An unexpected error occurred. Please try direct approve button.');
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add this function to handle direct approval by admin
  const handleDirectApprove = async () => {
    if (!service) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const response = await fetch('/api/admin/direct-approve-service', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serviceId: service.service_id,
          // eslint-disable-next-line react/no-unescaped-entities
          feedback: feedback || 'Approved directly by admin'
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to approve service directly');
      }
      
      toast.success('Service approved successfully');
      
      // Redirect back to reviewer dashboard
      router.push('/reviewer/dashboard');
    } catch (err) {
      console.error('Error in direct approve:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error(`Failed to directly approve: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!service || !selectedStatus) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const response = await fetch('/api/reviewer/update-service-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serviceId: service.service_id,
          status: selectedStatus
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update service status');
      }
      
      toast.success('Service status updated successfully');
      router.push('/reviewer/dashboard');
    } catch (err) {
      console.error('Error updating service status:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error('Failed to update service status');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-2">Loading service details...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">You must be logged in to review services</p>
        <button
          onClick={() => router.push(`/auth/login?redirectTo=/reviewer/services/${serviceId}`)}
          className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (!isHalalReviewer) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">You need Halal Reviewer permissions to access this page</p>
        <p className="text-sm text-gray-500">Your current role: {userRole || 'none'}</p>
        <p className="text-sm text-gray-500 mt-2">Please contact an administrator if you believe this is an error.</p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
        >
          Go to Homepage
        </button>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">Service not found or you don't have permission to review it</p>
        <Link
          href="/reviewer/dashboard"
          className="inline-block mt-4 bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }
  
  // Handle cases where users might be an array or single object
  const users = Array.isArray(service.users) ? service.users[0] : service.users;
  const categories = Array.isArray(service.categories) ? service.categories[0] : service.categories;
  
  const serviceOwnerEmail = users?.email || 'Unknown';
  const categoryName = categories?.name_en || 'Unknown';
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/reviewer/dashboard"
          className="text-primary hover:text-primary-dark inline-flex items-center"
        >
          ← Back to Dashboard
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{service.service_name}</h1>
              <p className="text-gray-500 mt-1">
                Category: {categoryName} | 
                Status: <span className={service.service_status === 'published' ? 'text-green-600' : 'text-yellow-600'}>
                  {service.service_status}
                </span>
              </p>
              <p className="text-gray-500">
                Submitted by: {serviceOwnerEmail} on {new Date(service.created_at || '').toLocaleDateString()}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Service ID: {service.service_id}
              </p>
            </div>
            
            <div className="flex space-x-2">
              <span className={`px-3 py-1 text-xs font-semibold rounded-full 
                ${service.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {service.is_verified ? 'Verified' : 'Pending Verification'}
              </span>
            </div>
          </div>
          
          {error && (
            <div className="mt-4 bg-red-50 text-red-600 p-4 rounded-md">
              {error}
            </div>
          )}
          
          <div className="mt-6">
            <h2 className="text-lg font-medium text-gray-900">Service Description</h2>
            <p className="text-gray-700 mt-2">
              {service.service_description || 'No description provided'}
            </p>
          </div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Contact Information</h2>
              <ul className="mt-2 space-y-2">
                <li className="text-gray-700">
                  <span className="font-medium">Email:</span> {service.contact_email}
                </li>
                {service.contact_phone && (
                  <li className="text-gray-700">
                    <span className="font-medium">Phone:</span> {service.contact_phone}
                  </li>
                )}
              </ul>
            </div>
            
            <div>
              <h2 className="text-lg font-medium text-gray-900">Social Media</h2>
              <ul className="mt-2 space-y-2">
                {service.social_instagram && (
                  <li className="text-gray-700">
                    <span className="font-medium">Instagram:</span> {service.social_instagram}
                  </li>
                )}
                {service.social_website && (
                  <li className="text-gray-700">
                    <span className="font-medium">Website:</span> {service.social_website}
                  </li>
                )}
                {!service.social_instagram && !service.social_website && (
                  <li className="text-gray-500">No social media provided</li>
                )}
              </ul>
            </div>
            
            <div>
              <h2 className="text-lg font-medium text-gray-900">Location</h2>
              <ul className="mt-2 space-y-2">
                {service.address_street && (
                  <li className="text-gray-700">
                    <span className="font-medium">Address:</span> {service.address_street}
                  </li>
                )}
                {service.address_zip && service.address_country && (
                  <li className="text-gray-700">
                    <span className="font-medium">Area:</span> {service.address_zip}, {service.address_country}
                  </li>
                )}
                {!service.address_street && !service.address_zip && !service.address_country && (
                  <li className="text-gray-500">No location provided</li>
                )}
              </ul>
            </div>
          </div>
          
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900">Review Decision</h2>
            <div className="mt-4">
              <label htmlFor="feedback" className="block text-sm font-medium text-gray-700">
                Feedback/Comments (required for rejection)
              </label>
              <textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                placeholder="Provide feedback about this service..."
              />
            </div>
            
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => handleReviewAction('reject')}
                disabled={isSubmitting}
                className="px-4 py-2 border border-red-600 text-red-600 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Processing...' : 'Reject Service'}
              </button>
              <button
                onClick={() => handleReviewAction('approve')}
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Processing...' : 'Approve Service'}
              </button>
            </div>
            
            {/* Debug section for troubleshooting */}
            {(userRole === 'admin' || userRole === 'halal_reviewer') && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Debug Information</h3>
                
                <div className="bg-gray-50 p-3 rounded text-xs font-mono overflow-auto">
                  <p>User ID: {user.id}</p>
                  <p>User Email: {user.email}</p>
                  <p>User Role: {userRole}</p>
                  <p>Auth Status: {user && !authLoading ? 'Authenticated' : 'Not Authenticated'}</p>
                  <p>Service Status: {service.service_status}</p>
                  <p>Is Verified: {service.is_verified ? 'Yes' : 'No'}</p>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    onClick={async () => {
                      if (!service) return;
                      
                      try {
                        const response = await fetch('/api/reviewer/debug-approve', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ serviceId: service.service_id }),
                          credentials: 'include'
                        });
                        
                        const result = await response.json();
                        
                        if (!response.ok) {
                          console.error('Debug approve failed:', result);
                          toast.error(`Debug approve failed: ${result.error}`);
                          return;
                        }
                        
                        toast.success('Service approved via debug endpoint');
                        router.push('/reviewer/dashboard');
                      } catch (err) {
                        console.error('Debug approve error:', err);
                        toast.error('Unexpected error during debug approve');
                      }
                    }}
                    className="px-3 py-1 bg-purple-600 text-white text-xs rounded"
                  >
                    Debug Approve
                  </button>
                  
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/auth/session', {
                          method: 'GET',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include'
                        });
                        
                        const result = await response.json();
                        console.log('Session check result:', result);
                        toast.success('Session check complete - see console');
                      } catch (err) {
                        console.error('Session check error:', err);
                        toast.error('Session check failed');
                      }
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded"
                  >
                    Check Session
                  </button>
                  
                  <button
                    onClick={async () => {
                      if (!service) return;
                      
                      try {
                        const response = await fetch('/api/debug/approve-service', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            serviceId: service.service_id,
                            feedback: feedback 
                          })
                        });
                        
                        const result = await response.json();
                        
                        if (!response.ok) {
                          console.error('Direct approve failed:', result);
                          toast.error(`Direct approve failed: ${result.error}`);
                          return;
                        }
                        
                        toast.success('Service approved successfully');
                        router.push('/reviewer/dashboard');
                      } catch (err) {
                        console.error('Direct approve error:', err);
                        toast.error('Unexpected error during direct approve');
                      }
                    }}
                    className="px-3 py-1 bg-red-600 text-white text-xs rounded"
                  >
                    Direct Approve (No Auth)
                  </button>
                </div>
              </div>
            )}
            
            {/* Direct Approve (for admins only) */}
            {userRole === 'admin' && (
              <button
                onClick={handleDirectApprove}
                disabled={isSubmitting}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Direct Approve (Admin Only)
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Button
          onClick={() => setIsEditing(true)}
          variant="default"
          size="default"
        >
          Review Service
        </Button>
      </div>

      {isEditing && (
        <div className="mt-6">
          <h2 className="text-lg font-medium text-gray-900">Update Service Status</h2>
          <div className="mt-4">
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Select new status:
            </label>
            <select
              id="status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            >
              <option value="">Select a status</option>
              <option value="pending">Pending</option>
              <option value="published">Published</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <Button
              onClick={() => setIsEditing(false)}
              variant="outline"
              size="default"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusUpdate}
              disabled={!selectedStatus}
              variant="default"
              size="default"
            >
              Update Status
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 