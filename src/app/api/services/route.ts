import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { validatePage, validatePageSize, validateString } from '@/lib/validate';
import { paginatedResponse, handleApiError } from '@/lib/api-response';
import { z } from 'zod';

// Define the Database type
type Database = {
  public: {
    Tables: {
      services: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: string;
          owner_id: string;
          price: number;
          status: string;
          created_at: string;
        }
        Insert: {
          title: string;
          description: string;
          category: string;
          owner_id: string;
          price: number;
          status?: string;
        }
      }
      profiles: {
        Row: {
          id: string;
          role: 'customer' | 'service_owner' | 'halal_reviewer' | 'admin';
          full_name?: string;
          avatar_url?: string;
        }
      }
    }
  }
}

// Define validation schema - used internally in POST method
const serviceValidationSchema = z.object({
  name: z.string().min(5, 'Service name must be at least 5 characters').max(100),
  category: z.string().min(1, 'Please select a category'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Price must be a valid number'),
  images: z.array(z.object({
    file: z.instanceof(File).optional(),
    url: z.string().optional(),
    path: z.string().optional(),
  })).optional(),
  logo_url: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    // Get and validate search parameters
    const { searchParams } = new URL(request.url);
    
    const page = validatePage(searchParams.get('page'));
    const pageSize = validatePageSize(searchParams.get('pageSize'));
    const query = validateString(searchParams.get('query'), '', 200);
    
    // Get valid categories first
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const { data: categoryData } = await supabase
      .from('services')
      .select('category')
      .order('category');
    
    // Calculate offset for pagination
    const offset = (page - 1) * pageSize;
    
    // Start building the query
    let serviceQuery = supabase
      .from('services')
      .select('*, profiles!service_provider_id(id, full_name, avatar_url)', { count: 'exact' });
    
    // Apply filters - add null check for categoryData
    if (categoryData && categoryData.length > 0) {
      serviceQuery = serviceQuery.eq('category', categoryData[0].category);
    }
    
    if (query) {
      // Use more efficient text search
      serviceQuery = serviceQuery.textSearch('title', query, {
        type: 'websearch',
        config: 'english'
      });
    }
    
    // Execute the query with pagination
    const { data, error, count } = await serviceQuery
      .range(offset, offset + pageSize - 1)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Database query error:', error);
      return handleApiError('Failed to fetch services');
    }
    
    // Fetch categories for filter (only distinct values)
    const { data: categories } = await supabase
      .from('services')
      .select('category')
      .order('category');
    
    // Extract unique categories - we log them but don't use them in response
    // This would typically be used for category filtering in the UI
    const uniqueCategories = categories
      ? Array.from(new Set(categories.map(item => item.category).filter(Boolean)))
      : [];
    console.log('Available categories:', uniqueCategories);
    
    // Calculate pagination info
    const totalPages = count ? Math.ceil(count / pageSize) : 0;
    
    // Add cache headers for better performance
    const headers = new Headers();
    headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    
    return paginatedResponse(data, {
      page,
      pageSize,
      totalItems: count || 0,
      totalPages
    }, { 
      cache: 'short'
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    // Create Supabase client
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Get session (for authentication)
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in to submit a service' },
        { status: 401 }
      );
    }
    
    // Verify user has service_owner role
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
      
    if (userError) {
      console.error('Error fetching user role:', userError);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to verify user permissions' },
        { status: 500 }
      );
    }
    
    if (userData.role !== 'service_owner' && userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only service owners can create services' },
        { status: 403 }
      );
    }
    
    // Parse request data
    const data = await request.json();
    
    console.log('Received service data:', data); // Debug log
    
    // Validate the data against our schema
    try {
      serviceValidationSchema.parse(data);
    } catch (validationError) {
      console.error('Validation error:', validationError);
      return NextResponse.json(
        { error: 'Validation failed', message: 'Invalid service data' },
        { status: 400 }
      );
    }
    
    // Basic validation
    if (!data.name || !data.description || !data.category) {
      return NextResponse.json(
        { error: 'Validation failed', message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    try {
      // Create the service
      const { data: service, error } = await supabase
        .from('services')
        .insert({
          title: data.name,
          description: data.description,
          category: data.category,
          price: parseFloat(data.price),
          owner_id: session.user.id,
          status: 'draft',
          is_verified: false
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating service:', error);
        return NextResponse.json(
          { error: 'Database error', message: error.message },
          { status: 500 }
        );
      }
      
      // Return success response
      return NextResponse.json(service, { status: 201 });
    } catch (dbError) {
      console.error('Database operation error:', dbError);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to create service. Please check your data format.' },
        { status: 500 }
      );
    }
    
  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: 'Server error', message: errorMessage },
      { status: 500 }
    );
  }
} 