import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/lib/database.types';

export const dynamic = 'force-dynamic';

export const GET = async (
  request: Request,
  { params }: { params: { id: string } }
) => {
  try {
    const businessId = params.id;
    
    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID is required' },
        { status: 400 }
      );
    }
    
    // Initialize Supabase client
    const supabase = createRouteHandlerClient<Database>({ cookies });
    
    // Fetch business by ID
    const { data: business, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();
      
    if (error) {
      console.error('Error fetching business:', error);
      return NextResponse.json(
        { error: 'Failed to fetch business' },
        { status: 500 }
      );
    }
    
    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }
    
    // Get business owner details
    const { data: owner, error: ownerError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .eq('id', business.owner_id)
      .single();
      
    // If there's an error fetching the owner, just log it and continue
    if (ownerError) {
      console.error('Error fetching business owner:', ownerError);
    }
    
    // Combine business and owner data
    const businessWithOwner = {
      ...business,
      owner: owner ? {
        id: owner.id,
        email: owner.email || '',
        raw_user_meta_data: {
          full_name: owner.full_name || '',
          avatar_url: owner.avatar_url || ''
        }
      } : null
    };
    
    return NextResponse.json({ business: businessWithOwner });
    
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}; 