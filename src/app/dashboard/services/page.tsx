'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Service as ServiceType, ServiceStatus } from '@/types/service';
import { Button } from "@/components/ui/button"

export default function ServicesDashboardPage() {
  const { user, supabase, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's services
  useEffect(() => {
    const fetchServices = async () => {
      if (!user) return;
      
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
            review_feedback,
            categories (
              category_id,
              name_en
            )
          `)
          .eq('service_owner_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching services:', error);
          setError('Failed to load your services. Please try again.');
          return;
        }
        
        setServices(data || []);
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (!authLoading) {
      fetchServices();
    }
  }, [user, supabase, authLoading]);

  // Handle status change
  const handleStatusChange = async (serviceId: string, newStatus: ServiceStatus) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ 
          service_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('service_id', serviceId)
        .eq('service_owner_id', user?.id); // Ensure user owns the service
        
      if (error) {
        console.error('Error updating service status:', error);
        alert('Failed to update service status. Please try again.');
        return;
      }
      
      // Update local state
      setServices(prevServices => 
        prevServices.map(service => 
          service.service_id === serviceId 
            ? { ...service, service_status: newStatus } 
            : service
        )
      );
    } catch (err) {
      console.error('Unexpected error updating status:', err);
      alert('An unexpected error occurred. Please try again.');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-2">Loading your services...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">You must be logged in to view your services</p>
        <button
          onClick={() => router.push('/auth/login?redirectTo=/dashboard/services')}
          className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
        >
          Sign In
        </button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Services</h1>
        <Button asChild variant="default" size="default">
          <Link href="/services/create">Create New Service</Link>
        </Button>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6">
          {error}
        </div>
      )}
      
      {services.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">You haven&apos;t created any services yet</p>
          <Button asChild variant="default" size="default">
            <Link href="/services/create">Create Your First Service</Link>
          </Button>
        </div>
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
                  Created
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {services.map((service) => (
                <tr key={service.service_id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{service.service_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {Array.isArray(service.categories) 
                        ? service.categories[0]?.name_en
                        : service.categories?.name_en || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      Status: <span className={`font-medium ${
                        service.service_status === 'published' && service.is_verified ? 'text-green-600' : 
                        service.service_status === 'rejected' ? 'text-red-600' :
                        'text-yellow-500'
                      }`}>
                        {service.service_status}{service.is_verified ? ' (Verified)' : ' (Unverified)'}
                      </span>
                    </div>
                    
                    {service.service_status === 'rejected' && service.review_feedback && (
                      <div className="mt-2 p-2 bg-red-50 text-sm text-red-800 rounded">
                        <span className="font-medium">Feedback from reviewer:</span> {service.review_feedback}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {service.created_at ? new Date(service.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link 
                      href={`/services/${service.service_id}`}
                      className="text-primary hover:text-primary-dark mr-4"
                    >
                      View
                    </Link>
                    <Link 
                      href={`/services/${service.service_id}/edit`}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </Link>
                    
                    {/* Status change actions */}
                    {service.service_status === 'draft' && (
                      <button
                        onClick={() => handleStatusChange(service.service_id, 'published' as ServiceStatus)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Publish
                      </button>
                    )}
                    
                    {service.service_status === 'published' && (
                      <button
                        onClick={() => handleStatusChange(service.service_id, 'archived' as ServiceStatus)}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        Archive
                      </button>
                    )}
                    
                    {service.service_status === 'archived' && (
                      <button
                        onClick={() => handleStatusChange(service.service_id, 'published' as ServiceStatus)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Restore
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 