import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Service } from '@/types/service';

interface ServiceCardProps {
  service: Service;
}

export default function ServiceCard({ service }: ServiceCardProps) {
  return (
    <Link href={`/services/${service.service_id}`}>
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative h-48 w-full">
          {service.service_logo?.url ? (
            <Image
              src={service.service_logo.url}
              alt={service.service_logo.alt || service.service_name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500">No image</span>
            </div>
          )}
          {service.is_verified && (
            <div className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
              Verified
            </div>
          )}
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2">{service.service_name}</h3>
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {service.service_description}
          </p>
          
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center">
              {service.owner?.avatar_url && (
                <Image
                  src={service.owner.avatar_url}
                  alt={service.owner.full_name}
                  width={24}
                  height={24}
                  className="rounded-full mr-2"
                />
              )}
              <span>{service.owner?.full_name || 'Unknown Owner'}</span>
            </div>
            <span>{service.service_view_count || 0} views</span>
          </div>
        </div>
      </div>
    </Link>
  );
} 