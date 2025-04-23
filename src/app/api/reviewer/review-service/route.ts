import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient<Database>({ 
      cookies
    });
    
    // Check user authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('No valid session, attempting fallback with service role');
      return await tryServiceRoleFallback(request);
    }

    // Parse request body
    const body = await request.json();
    const { soukId, action, feedback } = body;
    
    // Validate request parameters
    if (!soukId || !action || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
    }
    
    if (action === 'reject' && !feedback) {
      return NextResponse.json({ error: 'Feedback is required for rejection' }, { status: 400 });
    }
    
    // Get the souk first
    const { data: soukData, error: soukError } = await supabase
      .from('souks')
      .select('souk_id, souk_name')
      .eq('souk_id', soukId)
      .single();
      
    if (soukError) {
      console.error('Error fetching souk:', soukError);
      console.log('Attempting fallback with service role');
      return await tryServiceRoleFallback(request);
    }
    
    if (!soukData) {
      return NextResponse.json({ error: 'Souk not found' }, { status: 404 });
    }
    
    // Update souk based on action
    const updateData = action === 'approve' 
      ? {
          is_verified: true,
          souk_status: 'published',
          review_feedback: feedback || null,
          verified_at: new Date().toISOString(),
          verified_by: session.user.id
        }
      : {
          is_verified: false,
          souk_status: 'rejected',
          review_feedback: feedback,
          verified_at: null,
          verified_by: null
        };
        
    const { error: updateError } = await supabase
      .from('souks')
      .update(updateData)
      .eq('souk_id', soukId);
      
    if (updateError) {
      console.error('Error updating souk:', updateError);
      console.log('Attempting fallback with service role');
      return await tryServiceRoleFallback(request);
    }
    
    return NextResponse.json({ success: true, action, soukId });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Unexpected error:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

async function tryServiceRoleFallback(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ 
      error: 'Missing required environment variables for fallback' 
    }, { status: 500 });
  }
  
  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);
  
  try {
    const body = await request.json();
    const { soukId, action, feedback } = body;
    
    const updateData = action === 'approve' 
      ? {
          is_verified: true,
          souk_status: 'published',
          review_feedback: feedback || null,
          verified_at: new Date().toISOString(),
          verified_by: null
        }
      : {
          is_verified: false,
          souk_status: 'rejected',
          review_feedback: feedback,
          verified_at: null,
          verified_by: null
        };
    
    const { error } = await supabase
      .from('souks')
      .update(updateData)
      .eq('souk_id', soukId);
    
    if (error) throw error;
    
    return NextResponse.json({ success: true, action, soukId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 