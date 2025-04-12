export type ServiceStatus = 'draft' | 'published' | 'rejected' | 'archived' | 'suspended';

interface ServiceOwner {
  id: string;
  full_name: string;
  avatar_url?: string;
}

// Define types for nested join data
export interface ServiceUser {
  user_id?: string;
  id?: string;
  email: string;
}

export interface ServiceCategory {
  category_id: string;
  name_en: string;
}

export interface Service {
  service_id: string;
  service_owner_id: string;
  service_name: string;
  service_description?: string;
  service_logo?: string | {
    url: string;
    alt?: string;
  };
  is_verified?: boolean;
  verified_at?: string;
  verified_by?: string;
  service_view_count?: number;
  purchase_count?: number;
  category_id?: string;
  created_at?: string;
  updated_at?: string;
  contact_email?: string;
  contact_phone?: string;
  social_instagram?: string;
  social_website?: string;
  address_street?: string;
  address_zip?: string;
  address_country?: string;
  location_latitude?: number;
  location_longitude?: number;
  service_status?: ServiceStatus;
  owner?: ServiceOwner;
  // Review fields
  reviewer_id?: string;
  review_feedback?: string;
  reviewed_at?: string;
  
  // Relations (for joined data)
  // Supabase can return either a single object or an array depending on the join
  users?: ServiceUser | ServiceUser[];
  categories?: ServiceCategory | ServiceCategory[];
}

// Type for creating a new service (omits auto-generated fields)
export type CreateServiceInput = Omit<Service, 
  'service_id' | 
  'created_at' | 
  'updated_at' | 
  'service_view_count' | 
  'purchase_count' | 
  'is_verified' | 
  'verified_at' | 
  'verified_by' |
  'owner' |
  'reviewer_id' |
  'review_feedback' |
  'reviewed_at' |
  'users' |
  'categories'
>;

// Type for updating a service (all fields optional except service_id)
export type UpdateServiceInput = Partial<Omit<Service, 'service_id' | 'owner' | 'users' | 'categories'>> & {
  service_id: string;
}; 