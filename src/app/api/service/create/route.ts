import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ⚠️ IMPORTANT: For this to work, you need to add SUPABASE_SERVICE_ROLE_KEY to your .env.local file
export async function POST(request: Request) {
  try {
    const requestData = await request.json();
    console.log('API: Received data:', requestData);
    
    // Get data from the request
    const { userData, serviceData } = requestData;
    
    if (!userData || !serviceData) {
      return NextResponse.json(
        { error: 'Missing user or service data' },
        { status: 400 }
      );
    }
    
    // Create a Supabase client with admin privileges
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!supabaseUrl) {
      console.error('API: Missing Supabase URL');
      return NextResponse.json(
        { error: 'Missing Supabase URL. Check your environment variables.' },
        { status: 500 }
      );
    }
    
    if (!supabaseServiceKey) {
      console.error('API: Missing Supabase Service Role Key');
      return NextResponse.json(
        { 
          error: 'Missing SUPABASE_SERVICE_ROLE_KEY. Add this to your .env.local file.',
          helpText: 'You need to add the service role key from your Supabase dashboard to your environment variables.'
        },
        { status: 500 }
      );
    }
    
    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Execute a simple query to verify the connection works
    try {
      const { data: testData, error: testError } = await supabase
        .from('categories')
        .select('count')
        .limit(1);
        
      if (testError) {
        console.error('API: Supabase connection test failed:', testError);
        return NextResponse.json(
          { error: `Supabase connection failed: ${testError.message}` },
          { status: 500 }
        );
      }
      
      console.log('API: Supabase connection test succeeded:', testData);
    } catch (testError) {
      console.error('API: Supabase connection test exception:', testError);
      return NextResponse.json(
        { error: `Supabase connection test exception: ${String(testError)}` },
        { status: 500 }
      );
    }
    
    // First verify the user exists and has the service_owner role
    console.log('API: Checking user role for ID:', userData.id);
    const { data: userCheck, error: userError } = await supabase
      .from('users')
      .select('role, user_id')
      .eq('user_id', userData.id)
      .single();
      
    console.log('API: User check result:', userCheck);
    console.log('API: User check error:', userError);
    
    // If user not found by user_id, try by id
    if (userError) {
      console.log('API: User not found by user_id, trying by id field');
      const { data: userCheckById, error: userErrorById } = await supabase
        .from('users')
        .select('role, id')
        .eq('id', userData.id)
        .single();
        
      console.log('API: User check by id result:', userCheckById);
      console.log('API: User check by id error:', userErrorById);
      
      if (userErrorById) {
        console.error('API: Error checking user role by either id field:', userErrorById);
        return NextResponse.json(
          { error: `Error checking user role: User not found with ID ${userData.id}` },
          { status: 400 }
        );
      }
      
      // If found by id, use that user
      if (userCheckById && ['service_owner', 'admin'].includes(userCheckById.role)) {
        // Insert the service with service role (bypasses RLS)
        console.log('API: Inserting service with data using id field');
        const { data: newService, error: serviceError } = await supabase
          .from('services')
          .insert([{
            ...serviceData,
            service_owner_id: userCheckById.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }])
          .select('service_id')
          .single();
          
        console.log('API: Service creation result:', newService);
        console.log('API: Service creation error:', serviceError);
        
        if (serviceError) {
          console.error('API: Error creating service:', serviceError);
          return NextResponse.json(
            { error: `Error creating service: ${serviceError.message}` },
            { status: 400 }
          );
        }
        
        return NextResponse.json({ 
          success: true, 
          service: newService 
        });
      } else {
        console.error('API: User does not have service_owner role:', userCheckById);
        return NextResponse.json(
          { error: 'Only service owners can create services' },
          { status: 403 }
        );
      }
    }
    
    if (!userCheck || !['service_owner', 'admin'].includes(userCheck.role)) {
      console.error('API: User does not have service_owner role:', userCheck);
      return NextResponse.json(
        { error: 'Only service owners can create services' },
        { status: 403 }
      );
    }
    
    // Insert the service with service role (bypasses RLS)
    console.log('API: Inserting service with data:', serviceData);
    const { data: newService, error: serviceError } = await supabase
      .from('services')
      .insert([{
        ...serviceData,
        service_owner_id: userData.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select('service_id')
      .single();
      
    console.log('API: Service creation result:', newService);
    console.log('API: Service creation error:', serviceError);
    
    if (serviceError) {
      console.error('API: Error creating service:', serviceError);
      return NextResponse.json(
        { error: `Error creating service: ${serviceError.message}` },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      service: newService 
    });
    
  } catch (error) {
    console.error('API: Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Unexpected error occurred',
        details: String(error)
      },
      { status: 500 }
    );
  }
} 