import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This is a direct API endpoint that bypasses authentication
// Only for development debugging - would be removed in production
export async function POST(request: Request) {
  try {
    // Create direct Supabase client using service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables for Supabase connection');
      console.error('Make sure to add SUPABASE_SERVICE_ROLE_KEY to your .env.local file');
      console.error('You can get this key from your Supabase project settings > API > service_role key');
      
      return NextResponse.json({ 
        error: 'Missing required environment variables for Supabase connection',
        help: 'Add SUPABASE_SERVICE_ROLE_KEY to your .env.local file. Get this from Supabase project settings > API.'
      }, { status: 500 });
    }
    
    // Create a Supabase client with the service role key
    // This bypasses RLS policies and auth requirements
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Parse request body
    const body = await request.json();
    const { serviceId, feedback } = body;
    
    if (!serviceId) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 });
    }
    
    console.log('Debug direct approve request:', { serviceId, feedback });
    
    // First check if the service exists
    const { data: serviceData, error: serviceError } = await supabase
      .from('services')
      .select('service_id, service_name, is_verified, service_status')
      .eq('service_id', serviceId)
      .single();
    
    if (serviceError) {
      console.error('Error fetching service:', serviceError);
      return NextResponse.json({ 
        error: 'Service not found or error fetching service', 
        details: serviceError.message
      }, { status: 404 });
    }
    
    console.log('Found service to approve:', serviceData);
    
    // Update service directly using service role (bypasses RLS)
    const { error: updateError } = await supabase
      .from('services')
      .update({
        is_verified: true,
        service_status: 'published',
        review_feedback: feedback || null,
        verified_at: new Date().toISOString(),
        verified_by: null // No user ID available in direct approve
      })
      .eq('service_id', serviceId);
    
    if (updateError) {
      console.error('Error updating service:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update service', 
        details: updateError.message 
      }, { status: 500 });
    }
    
    // Verify the update was successful
    const { data: verifyData, error: verifyError } = await supabase
      .from('services')
      .select('service_id, service_name, is_verified, service_status')
      .eq('service_id', serviceId)
      .single();
      
    if (verifyError) {
      console.error('Error verifying update:', verifyError);
    } else {
      console.log('Service verification after update:', verifyData);
    }
    
    console.log('Service approved successfully via DIRECT debug endpoint');
    return NextResponse.json({ 
      success: true, 
      message: 'Service approved successfully via direct endpoint',
      service: verifyData || serviceData
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Unexpected error:', errorMessage);
    return NextResponse.json({ 
      error: 'An unexpected error occurred', 
      details: errorMessage
    }, { status: 500 });
  }
} 