import { createServerClient } from '@/lib/supabase-server';
import { Service, ServiceListItem } from '../types';

interface FetchServicesOptions {
  page?: number;
  pageSize?: number;
  category?: string;
  query?: string;
}

export async function fetchServices({
  page = 1,
  pageSize = 9,
  category = 'all',
  query = ''
}: FetchServicesOptions = {}) {
  const supabase = createServerClient();
  const offset = (page - 1) * pageSize;

  let serviceQuery = supabase
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
        full_name,
        avatar_url
      )
    `, { count: 'exact' })
    .eq('service_status', 'published');

  if (category !== 'all') {
    serviceQuery = serviceQuery.eq('category_id', category);
  }

  if (query) {
    serviceQuery = serviceQuery.textSearch('service_name,service_description', query, {
      type: 'websearch',
      config: 'english'
    });
  }

  const { data: services, count, error } = await serviceQuery
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    throw new Error(`Error fetching services: ${error.message}`);
  }

  const formattedServices: ServiceListItem[] = services?.map(service => ({
    service_id: service.service_id,
    service_name: service.service_name,
    service_description: service.service_description,
    service_logo: service.service_logo,
    category_id: service.category_id,
    contact_email: service.contact_email,
    contact_phone: service.contact_phone,
    address_country: service.address_country,
    owner: service.users?.[0] ? {
      id: service.users[0].user_id,
      full_name: service.users[0].full_name || '',
      avatar_url: service.users[0].avatar_url || ''
    } : undefined,
    location: service.address_country
  })) || [];

  return {
    services: formattedServices,
    pagination: {
      page,
      pageSize,
      totalItems: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize)
    }
  };
}

export async function fetchCategories() {
  const supabase = createServerClient();
  
  const { data: categoryData, error } = await supabase
    .from('categories')
    .select('category_id, name_en')
    .order('name_en');

  if (error) {
    throw new Error(`Error fetching categories: ${error.message}`);
  }

  return categoryData?.map(category => ({
    id: category.category_id,
    name: category.name_en
  })) || [];
} 