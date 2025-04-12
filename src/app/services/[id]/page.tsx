'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Service } from '@/types';

export default function ServiceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    async function fetchService() {
      try {
        const response = await fetch(`/api/services/${params.id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Service not found');
          }
          throw new Error('Failed to fetch service');
        }
        
        const data = await response.json();
        setService(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    
    fetchService();
  }, [params.id]);
  
  if (loading) {
    return <div className="text-center py-10">Loading service details...</div>;
  }
  
  if (error) {
    return (
      <div className="text-center py-10 text-red-500">
        Error: {error}
      </div>
    );
  }
  
  if (!service) {
    return <div className="text-center py-10">Service not found</div>;
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      {!service.is_verified && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
          <h3 className="text-yellow-800 font-medium">Service Pending Verification</h3>
          <p className="text-yellow-700 mt-1 text-sm">
            This service is currently under review by our halal reviewers. Some information may be limited until verification is complete.
          </p>
        </div>
      )}
      
      <button 
        onClick={() => router.back()}
        className="mb-6 text-indigo-600 hover:text-indigo-800"
      >
        ← Back to services
      </button>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="relative h-64 w-full">
          {service.logo_url ? (
            <Image
              src={service.logo_url}
              alt={service.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500">No image</span>
            </div>
          )}
        </div>
        
        <div className="p-6">
          <div className="flex justify-between items-start">
            <h1 className="text-3xl font-bold">{service.name}</h1>
            {service.is_verified && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                Verified
              </span>
            )}
          </div>
          
          <p className="text-gray-600 mt-4">{service.description}</p>
          
          <div className="mt-6">
            <h2 className="text-xl font-semibold">About This Service</h2>
            <div className="mt-2 grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-500">Category:</span>
                <span className="ml-2">{service.category}</span>
              </div>
              <div>
                <span className="text-gray-500">Views:</span>
                <span className="ml-2">{service.view_count || 0}</span>
              </div>
              <div>
                <span className="text-gray-500">Created:</span>
                <span className="ml-2">
                  {new Date(service.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          {service.owner && (
            <div className="mt-8 border-t pt-6">
              <h2 className="text-xl font-semibold">Service Provider</h2>
              <div className="mt-4 flex items-center">
                {service.owner.avatar_url ? (
                  <Image
                    src={service.owner.avatar_url}
                    alt={service.owner.full_name || 'Service owner'}
                    width={64}
                    height={64}
                    className="rounded-full mr-4"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 mr-4"></div>
                )}
                <div>
                  <h3 className="font-medium">{service.owner.full_name || 'Anonymous'}</h3>
                  {service.owner.about && (
                    <p className="text-gray-600 mt-1">{service.owner.about}</p>
                  )}
                  {service.owner.website && (
                    <a 
                      href={service.owner.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 mt-1 block"
                    >
                      Website
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 