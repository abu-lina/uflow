'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Service as ServiceType } from '@/types/service';
import { Button } from "@/components/ui/button"

export default function ReviewerDashboardPage() {
  const { user, supabase, isLoading: authLoading, userRole } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [pendingServices, setPendingServices] = useState<ServiceType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  // Check if user has the halal_reviewer role
  const isHalalReviewer = userRole === 'halal_reviewer' || userRole === 'admin';

  // Fetch pending services
  useEffect(() => {
    const fetchPendingServices = async () => {
      if (!user || !isHalalReviewer) return;
      
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
            is_verified,
            service_status,
            created_at,
            contact_email,
            category_id,
            users!services_service_owner_id_fkey1 (
              user_id,
              email
            ),
            categories (
              category_id,
              name_en
            )
          `)
          .eq('is_verified', false)
          .in('service_status', ['draft', 'published']);
          
        if (error) {
          console.error('Error fetching pending services:', error);
          setError('Failed to load pending services. Please try again.');
          return;
        }
        
        setPendingServices(data || []);
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (!authLoading) {
      fetchPendingServices();
    }
  }, [user, supabase, authLoading, isHalalReviewer, userRole]);

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-2">Loading pending services...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">You must be logged in to access the reviewer dashboard</p>
        <button
          onClick={() => router.push('/auth/login?redirectTo=/reviewer/dashboard')}
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

  const handleReviewClick = (service: ServiceType) => {
    setSelectedService(service);
    setSelectedStatus(service.service_status);
  };

  const handleStatusUpdate = () => {
    // Implementation of status update logic
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Halal Reviewer Dashboard</h1>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
          {error}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Services Pending Review</h2>
          
          {pendingServices.length === 0 ? (
            <p className="text-gray-500">No services are pending review at this time.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted By
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Submitted
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingServices.map((service) => {
                    // Handle cases where users might be an array or single object 
                    const users = Array.isArray(service.users) ? service.users[0] : service.users;
                    const categories = Array.isArray(service.categories) ? service.categories[0] : service.categories;
                    
                    const ownerEmail = users?.email || 'Unknown';
                    const categoryName = categories?.name_en || 'Unknown';
                    return (
                      <tr key={service.service_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {service.service_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{categoryName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            service.service_status === 'published' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {service.service_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{ownerEmail}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(service.created_at || '').toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button
                            onClick={() => handleReviewClick(service)}
                            variant="default"
                            size="default"
                          >
                            Review Service
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedService && (
        <div className="mt-6 p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Review Service</h2>
          
          {/* Review service form content */}

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              onClick={() => setSelectedService(null)}
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