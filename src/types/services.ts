import { Database } from './database';

// Base service type from database
export type Service = Database['public']['Tables']['services']['Row'];

// Business type
export type Business = {
  id: string;
  name: string | null;
  logo_url: string | null;
  description: string | null;
};

// Service with business information
export type ServiceWithBusiness = Service & {
  business: Business;
};

// API response type for services listing
export interface ServicesApiResponse {
  services: ServiceWithBusiness[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number | null;
    totalPages: number;
  };
  categories: string[];
} 