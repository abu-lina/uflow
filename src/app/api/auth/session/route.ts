import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore 
    });
    
    // Check current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return NextResponse.json({
        error: sessionError.message,
        authenticated: false
      }, { status: 500 });
    }
    
    if (!session) {
      return NextResponse.json({
        authenticated: false,
        message: 'No active session found'
      });
    }
    
    // Get user data including role
    let userData = null;
    let userError = null;
    
    try {
      // Get user data from profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      userData = data;
      userError = error;
      
      if (error) {
        console.error('User data error:', error);
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      userError = err instanceof Error ? err.message : String(err);
    }
    
    return NextResponse.json({
      authenticated: true,
      session: {
        id: session.user.id,
        email: session.user.email,
        created_at: session.user.created_at,
        last_sign_in_at: session.user.last_sign_in_at,
        app_metadata: session.user.app_metadata,
        user_metadata: session.user.user_metadata,
        expires_at: session.expires_at,
      },
      userData,
      userError: userError ? String(userError) : null
    });
    
  } catch (error) {
    console.error('Unexpected error checking session:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json({
      authenticated: false,
      error: errorMessage
    }, { status: 500 });
  }
} 