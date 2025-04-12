import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function POST(request: Request) {
  try {
    // Parse request body first
    const body = await request.json();
    const { serviceId, feedback } = body;
    
    if (!serviceId) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 });
    }
    
    console.log('Debug approve request:', { serviceId, feedback });
    
    // Try with auth cookies first
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // First check if the service exists
    const { data: serviceData, error: serviceError } = await supabase
      .from('services')
      .select('service_id, service_name, is_verified, service_status')
      .eq('service_id', serviceId)
      .single();
    
    if (serviceError) {
      console.error('Error fetching service with cookie auth:', serviceError);
      
      // Fall back to service role if we can't find the service with cookie auth
      return await fallbackServiceRoleUpdate(serviceId, feedback);
    }
    
    console.log('Found service to approve with cookie auth:', serviceData);
    
    // Try updating with cookie auth
    const { error: updateError } = await supabase
      .from('services')
      .update({
        is_verified: true,
        service_status: 'published',
        review_feedback: feedback || null,
        verified_at: new Date().toISOString(),
        verified_by: serviceData ? null : null
      })
      .eq('service_id', serviceId);
    
    if (updateError) {
      console.error('Error updating service with cookie auth:', updateError);
      
      // Fall back to service role if update fails
      return await fallbackServiceRoleUpdate(serviceId, feedback);
    }
    
    console.log('Service approved successfully via DEBUG endpoint (cookie auth)');
    return NextResponse.json({ 
      success: true, 
      message: 'Service approved successfully via debug endpoint (cookie auth)'
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Unexpected error:', errorMessage);
    
    // Try fallback on any unexpected error
    try {
      const body = await request.json();
      const { serviceId, feedback } = body;
      if (serviceId) {
        return await fallbackServiceRoleUpdate(serviceId, feedback);
      }
    } catch (fallbackError) {
      // If even the fallback fails, just return the original error
      console.error('Fallback also failed:', fallbackError);
    }
    
    return NextResponse.json({ 
      error: 'An unexpected error occurred', 
      details: errorMessage,
      help: 'Try the Direct Approve button instead'
    }, { status: 500 });
  }
}

async function fallbackServiceRoleUpdate(serviceId: string, feedback?: string) {
  console.log('Attempting fallback with service role...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables for service role fallback');
    return NextResponse.json({ 
      error: 'Missing required environment variables for fallback', 
      help: 'Try the Direct Approve button instead'
    }, { status: 500 });
  }
  
  // Create direct client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  // Update service directly
  const { error: updateError } = await supabase
    .from('services')
    .update({
      is_verified: true,
      service_status: 'published',
      review_feedback: feedback || null,
      verified_at: new Date().toISOString(),
      verified_by: null
    })
    .eq('service_id', serviceId);
  
  if (updateError) {
    console.error('Error updating service with service role fallback:', updateError);
    return NextResponse.json({ 
      error: 'Failed to update service with fallback', 
      details: updateError.message,
      help: 'Try the Direct Approve button instead'
    }, { status: 500 });
  }
  
  console.log('Service approved successfully via DEBUG endpoint (service role fallback)');
  return NextResponse.json({ 
    success: true, 
    message: 'Service approved successfully via debug endpoint (service role fallback)'
  });
} 