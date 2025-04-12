import { Suspense } from 'react';
import { createServerClient } from '@/lib/supabase-server';
import ServicesList from '@/components/ServicesList';
import SearchFilter from '@/components/SearchFilter';
import CategoryFilter from '@/components/CategoryFilter';
import { Service } from '@/types/service';
import Link from 'next/link';

// Type for search params
interface SearchParams {
  page?: string;
  category?: string;
  query?: string;
}

export default async function ServicesPage({
  searchParams
}: {
  searchParams: SearchParams
}) {
  // Parse search parameters
  const params = await Promise.resolve(searchParams);
  const page = parseInt(params.page || '1');
  const category = params.category || 'all';
  const query = params.query || '';
  const pageSize = 9;
  
  // Calculate offset for pagination
  const offset = (page - 1) * pageSize;
  
  // Create server-side Supabase client
  const supabase = createServerClient();
  
  // Start building the query
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
    .eq('service_status', 'published');  // Only show published services
  
  // Apply filters
  if (category !== 'all') {
    serviceQuery = serviceQuery.eq('category_id', category);
  }
  
  if (query) {
    serviceQuery = serviceQuery.textSearch('service_name,service_description', query, {
      type: 'websearch',
      config: 'english'
    });
  }
  
  // Execute the query
  const { data: services, count, error } = await serviceQuery
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);
  
  // Add debugging to see what's happening
  console.log('Services query result:', { serviceCount: services?.length, count, error });
  
  // Format services to match expected structure
  const formattedServices: Service[] = services?.map(service => ({
    service_id: service.service_id,
    service_owner_id: service.service_owner_id,
    service_name: service.service_name,
    service_description: service.service_description,
    service_logo: service.service_logo,
    is_verified: service.is_verified,
    service_view_count: service.service_view_count,
    purchase_count: service.purchase_count,
    category_id: service.category_id,
    created_at: service.created_at,
    updated_at: service.updated_at,
    contact_email: service.contact_email,
    contact_phone: service.contact_phone,
    social_instagram: service.social_instagram,
    social_website: service.social_website,
    address_street: service.address_street,
    address_zip: service.address_zip,
    address_country: service.address_country,
    location_latitude: service.location_latitude,
    location_longitude: service.location_longitude,
    service_status: service.service_status,
    owner: service.users?.[0] ? {
      id: service.users[0].user_id,
      full_name: service.users[0].full_name || '',
      avatar_url: service.users[0].avatar_url || ''
    } : undefined
  })) || [];
  
  // Calculate pagination
  const totalItems = count || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  
  // Fetch unique categories for filter
  const { data: categoryData } = await supabase
    .from('categories')
    .select('category_id, name_en')
    .order('name_en');
  
  const categories = categoryData?.map(category => ({
    id: category.category_id,
    name: category.name_en
  })) || [];
  
  // Return JSX directly from server component
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Services</h1>
        <Link
          href="/services/create"
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
        >
          Create Service
        </Link>
      </div>
      
      {/* Debug information - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-4 bg-gray-100 rounded-lg overflow-auto max-h-64">
          <h2 className="font-bold mb-2">Debug:</h2>
          <p>Services found: {formattedServices.length}</p>
          <p>Raw services data: {JSON.stringify(services, null, 2)}</p>
          <p>Query error: {error ? JSON.stringify(error) : 'None'}</p>
        </div>
      )}
      
      <div className="mb-8">
        <SearchFilter 
          initialQuery={query} 
          placeholder="Search services..." 
        />
      </div>
      
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 shrink-0">
          <CategoryFilter
            categories={[
              { id: 'all', name: 'All Categories' },
              ...categories
            ]} 
            selectedCategory={category}
          />
        </div>
        
        <div className="flex-1">
          <Suspense fallback={<div className="text-center py-10">Loading services...</div>}>
            <ServicesList 
              services={formattedServices}
              pagination={{
                page,
                pageSize,
                totalItems,
                totalPages
              }}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
} 