import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { validatePage, validatePageSize, validateString } from '@/lib/validate';

// Use edge runtime for better performance
export const runtime = 'edge';

// Set dynamic cache configuration
export const revalidate = 60; // Revalidate at most once per minute

export async function GET(request: NextRequest) {
  try {
    // Start performance measurement
    const startTime = Date.now();
    
    // Get and validate search parameters
    const { searchParams } = new URL(request.url);
    
    const page = validatePage(searchParams.get('page'));
    const pageSize = validatePageSize(searchParams.get('pageSize'));
    const query = validateString(searchParams.get('query'));
    const category = validateString(searchParams.get('category'));
    
    // Initialize Supabase client
    const supabase = createRouteHandlerClient({ cookies });
    
    // Use a single query with joins for better performance
    let queryBuilder = supabase
      .from('businesses')
      .select(`
        *,
        profiles:owner_id (
          id, full_name, avatar_url, email
        )
      `, { count: 'exact' });
    
    // Apply filters - multiple conditions in a single query
    if (query && category && category !== 'all') {
      queryBuilder = queryBuilder
        .textSearch('name,description', query, {
          type: 'websearch',
          config: 'english'
        })
        .eq('category', category);
    } else if (query) {
      queryBuilder = queryBuilder
        .textSearch('name,description', query, {
          type: 'websearch',
          config: 'english'
        });
    } else if (category && category !== 'all') {
      queryBuilder = queryBuilder
        .eq('category', category);
    }
    
    // Execute the query
    const { data, error, count } = await queryBuilder
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: {
          message: 'Failed to fetch businesses',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        } 
      }, { status: 500 });
    }
    
    // Get the business owner information - commented out as it's currently unused
    // const { data: users, error: ownersError } = await supabase
    //     .from('users')
    //     .select('id, email, role, raw_user_meta_data')
    //     .in('id', data.map(b => b.owner_id));
        
    // if (ownersError) {
    //     return NextResponse.json({ error: ownersError.message }, { status: 500 });
    // }
    
    // Transform the data - use efficient mapping
    const transformedData = data?.map(business => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { profiles, ...businessWithoutProfiles } = business;
      
      return {
        ...businessWithoutProfiles,
        owner: business.profiles ? {
          id: business.profiles.id,
          email: business.profiles.email || '',
          raw_user_meta_data: {
            full_name: business.profiles.full_name || '',
            avatar_url: business.profiles.avatar_url || ''
          }
        } : {
          id: business.owner_id,
          email: '',
          raw_user_meta_data: {
            full_name: '',
            avatar_url: ''
          }
        }
      };
    });
    
    // Calculate pagination
    const totalPages = count ? Math.ceil(count / pageSize) : 0;
    
    // Set up caching headers
    const headers = new Headers();
    headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    
    // Calculate execution time for monitoring
    const executionTime = Date.now() - startTime;
    headers.set('Server-Timing', `api;dur=${executionTime}`);
    
    // Return the response
    return NextResponse.json({
      success: true,
      data: transformedData || [],
      pagination: {
        page,
        pageSize,
        totalItems: count || 0,
        totalPages
      }
    }, { headers });
  } catch (error) {
    console.error('Unexpected error in businesses API:', error);
    return NextResponse.json({ 
      success: false, 
      error: {
        message: 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      }
    }, { status: 500 });
  }
}