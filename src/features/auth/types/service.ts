export interface Service {
  id: string;
  service_id: string;
  service_owner_id: string;
  service_name: string;
  service_description: string;
  is_verified: boolean;
  service_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  contact_email: string;
  category_id: string;
  users: {
    user_id: string;
    email: string;
  }[];
  categories: {
    category_id: string;
    name: string;
  }[];
}

export type ServiceStatus = 'pending' | 'approved' | 'rejected';
