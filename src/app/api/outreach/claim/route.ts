import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { 
  validateOutreachToken, 
  consumeToken, 
  updateOutreachStatus,
  getOutreachByProvider,
  hashToken 
} from '@/services/outreach';

// Create a Supabase client with auth context
async function getSupabaseAuth() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    // Validate request
    if (!token) {
      return NextResponse.json(
        { error: 'Claim token is required' },
        { status: 400 }
      );
    }

    // Get the authenticated user
    const supabaseAuth = await getSupabaseAuth();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in first.' },
        { status: 401 }
      );
    }

    // Hash and validate token
    const tokenHash = hashToken(token);
    const validationResult = await validateOutreachToken(tokenHash);

    if (!validationResult.isValid) {
      return NextResponse.json(
        { error: validationResult.errorMessage || 'Invalid claim token' },
        { status: 401 }
      );
    }

    const { providerId } = validationResult;
    if (!providerId) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    // Get the outreach record
    const outreach = await getOutreachByProvider(providerId);
    
    // Use admin client to update provider ownership
    const supabaseAdmin = getSupabaseAdmin();

    // Check provider is still unclaimed
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('providers')
      .select('provider_id, provider_owner_id, provider_name')
      .eq('provider_id', providerId)
      .single();

    if (providerError || !provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }

    if (provider.provider_owner_id) {
      return NextResponse.json(
        { error: 'This provider has already been claimed' },
        { status: 409 }
      );
    }

    // Claim the provider - set provider_owner_id to the authenticated user
    const { error: updateError } = await supabaseAdmin
      .from('providers')
      .update({ 
        provider_owner_id: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('provider_id', providerId);

    if (updateError) {
      console.error('Failed to claim provider:', updateError);
      return NextResponse.json(
        { error: 'Failed to claim provider' },
        { status: 500 }
      );
    }

    // Update outreach status if exists
    if (outreach) {
      await updateOutreachStatus(outreach.id, 'claimed', `Claimed by user ${user.id}`);
    }

    // Consume the token
    await consumeToken(tokenHash);

    return NextResponse.json({ 
      success: true, 
      message: 'Provider successfully claimed',
      providerId,
      providerName: provider.provider_name
    });
  } catch (error) {
    console.error('Claim error:', error);
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
