import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function POST(request: Request) {
  try {
    // Create a new cookies() instance each time - don't reuse
    const supabase = createRouteHandlerClient<Database>({ 
      cookies
    });
    
    // Check user authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('Session check:', { 
      hasSession: !!session, 
      sessionError: sessionError ? sessionError.message : null,
      userId: session?.user?.id
    });
    
    if (!session) {
      console.log('No valid session, attempting fallback with service role');
      return await tryServiceRoleFallback(request);
    }

    // Parse request body
    const body = await request.json();
    const { serviceId, action, feedback } = body;
    
    console.log('Review request:', { 
      serviceId, 
      action,
      userId: session.user.id,
      userEmail: session.user.email
    });
    
    // Validate request parameters
    if (!serviceId || !action || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
    }
    
    if (action === 'reject' && !feedback) {
      return NextResponse.json({ error: 'Feedback is required for rejection' }, { status: 400 });
    }
    
    // Get the service first
    const { data: serviceData, error: serviceError } = await supabase
      .from('services')
      .select('service_id, service_name')
      .eq('service_id', serviceId)
      .single();
      
    if (serviceError) {
      console.error('Error fetching service:', serviceError);
      console.log('Attempting fallback with service role');
      return await tryServiceRoleFallback(request);
    }
    
    if (!serviceData) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }
    
    // Update service based on action
    const updateData = action === 'approve' 
      ? {
          is_verified: true,
          service_status: 'published',
          review_feedback: feedback || null,
          verified_at: new Date().toISOString(),
          verified_by: session.user.id
        }
      : {
          is_verified: false,
          service_status: 'rejected',
          review_feedback: feedback,
          verified_at: null,
          verified_by: null
        };
        
    console.log('Updating service:', { serviceId, updateData });
    
    const { error: updateError } = await supabase
      .from('services')
      .update(updateData)
      .eq('service_id', serviceId);
      
    if (updateError) {
      console.error('Error updating service:', updateError);
      console.log('Attempting fallback with service role');
      return await tryServiceRoleFallback(request);
    }
    
    console.log('Service updated successfully');
    return NextResponse.json({ success: true, action, serviceId });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Unexpected error:', errorMessage);
    
    // Try service role as last resort
    try {
      return await tryServiceRoleFallback(request);
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
    }
    
    return NextResponse.json({ 
      error: 'An unexpected error occurred', 
      details: errorMessage,
      help: 'Try using the Direct Approve button instead'
    }, { status: 500 });
  }
}

// Fallback function that uses the service role key
async function tryServiceRoleFallback(request: Request) {
  console.log('Attempting service role fallback for review-service');
  
  try {
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'Missing environment variables for service fallback', 
        help: 'Try the Direct Approve button instead'
      }, { status: 500 });
    }
    
    // Parse request again
    const body = await request.json();
    const { serviceId, action, feedback } = body;
    
    if (!serviceId || !action || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
    }
    
    if (action === 'reject' && !feedback) {
      return NextResponse.json({ error: 'Feedback is required for rejection' }, { status: 400 });
    }
    
    // Create service role client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // First check if service exists
    const { error: serviceError } = await supabase
      .from('services')
      .select('service_id, service_name')
      .eq('service_id', serviceId)
      .single();
      
    if (serviceError) {
      console.error('Service role fallback - Error fetching service:', serviceError);
      return NextResponse.json({ 
        error: 'Service not found or error fetching service', 
        details: serviceError.message
      }, { status: 404 });
    }
    
    // Update the service - use service role for direct access
    const updateData = action === 'approve' 
      ? {
          is_verified: true,
          service_status: 'published',
          review_feedback: feedback || null,
          verified_at: new Date().toISOString(),
          verified_by: null // No session user ID available
        }
      : {
          is_verified: false,
          service_status: 'rejected',
          review_feedback: feedback,
          verified_at: null,
          verified_by: null
        };
    
    console.log('Service role fallback - Updating service:', { serviceId, updateData });
    
    const { error: updateError } = await supabase
      .from('services')
      .update(updateData)
      .eq('service_id', serviceId);
    
    if (updateError) {
      console.error('Service role fallback - Error updating service:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update service with fallback', 
        details: updateError.message,
        help: 'Try the Direct Approve button instead'
      }, { status: 500 });
    }
    
    console.log('Service updated successfully via SERVICE ROLE fallback');
    return NextResponse.json({ 
      success: true, 
      message: 'Service ' + (action === 'approve' ? 'approved' : 'rejected') + ' successfully (service role fallback)',
      serviceId
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Service role fallback - Unexpected error:', errorMessage);
    return NextResponse.json({ 
      error: 'Service role fallback failed', 
      details: errorMessage,
      help: 'Try the Direct Approve button instead'
    }, { status: 500 });
  }
} 