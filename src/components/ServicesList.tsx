'use client';

import React from 'react';
import ServiceCard from './ServiceCard';
import Pagination from './Pagination';
import { Service } from '@/types/service';

interface PaginationData {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

interface ServicesListProps {
  services: Service[];
  pagination: PaginationData;
  onPageChange?: (page: number) => void;
}

const ServicesList: React.FC<ServicesListProps> = ({
  services,
  pagination,
  onPageChange
}) => {
  // Handle case when there are no services
  if (services.length === 0) {
    return (
      <div 
        className="text-center py-12 bg-gray-50 rounded-lg" 
        role="status" 
        aria-live="polite"
      >
        <p className="text-gray-500">No services found. Try different search criteria.</p>
      </div>
    );
  }
  
  // Render the list of services
  return (
    <div>
      <div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        role="feed"
        aria-busy={false}
        aria-label="Services list"
      >
        {services.map((service) => (
          <ServiceCard key={service.service_id} service={service} />
        ))}
      </div>
      
      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
};

export default ServicesList; 