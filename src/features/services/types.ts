export interface ServiceOwner {
  id: string;
  full_name: string;
  avatar_url: string;
}

export interface ServiceListItem {
  service_id: string;
  service_name: string;
  service_description: string;
  service_logo?: string;
  category_id: string;
  contact_email?: string;
  contact_phone?: string;
  address_country?: string;
  owner?: ServiceOwner;
  location?: string;
  price?: number;
}

export interface Service extends ServiceListItem {
  service_owner_id: string;
  is_verified: boolean;
  service_view_count: number;
  purchase_count: number;
  created_at: string;
  updated_at: string;
  social_instagram?: string;
  social_website?: string;
  address_street?: string;
  address_zip?: string;
  location_latitude?: number;
  location_longitude?: number;
  service_status: 'draft' | 'published' | 'rejected' | 'archived' | 'suspended';
}

export interface ServiceCategory {
  id: string;
  name: string;
}

export interface ServiceSearchParams {
  page?: number;
  pageSize?: number;
  category?: string;
  query?: string;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
