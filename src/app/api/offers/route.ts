import { createServerClient } from '@/lib/database/supabase-server';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/database';

type Offer = Database['public']['Tables']['offers']['Row'];

// NOTE: This endpoint relies on Supabase RLS for access control.
// Only authorized users (per RLS) can create/update/delete offers.
// Do not trust user_id or souk_owner_id from the client.

// GET handler for fetching offers
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const soukId = searchParams.get('soukId');
    const supabase = createServerClient();

    if (id) {
      // Fetch single offer
      const { data, error } = await supabase
        .from('offers')
        .select('*, profiles(*)')
        .eq('id', id)
        .single();

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: error.code === 'PGRST116' ? 404 : 500 }
        );
      }

      return NextResponse.json({ data: data as Offer });
    } else {
      // Fetch offers with optional filtering
      let query = supabase.from('offers').select('*, profiles(*)', { count: 'exact' });

      if (soukId) {
        query = query.eq('souk_id', soukId);
      }

      const { data, error, count } = await query;

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        data: data as Offer[],
        total: count || 0
      });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST handler for creating offers
export async function POST(request: Request) {
  try {
    const data = await request.json();
    // Validate required fields for POST
    const requiredFields = ['souk_id', 'title'];
    for (const field of requiredFields) {
      if (data[field] === undefined) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    const supabase = createServerClient();
    const { data: insertedData, error } = await supabase
      .from('offers')
      .insert(data)
      .select('*, profiles(*)')
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: insertedData as Offer });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PATCH handler for updating offers
export async function PATCH(request: Request) {
  try {
    const { id, data } = await request.json();
    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }
    // Validate required fields for PATCH
    const allowedFields = ['souk_id', 'title', 'description', 'price', 'image_urls', 'status', 'view_count', 'created_at', 'updated_at'];
    for (const key of Object.keys(data)) {
      if (!allowedFields.includes(key)) {
        return NextResponse.json(
          { error: `Invalid field: ${key}` },
          { status: 400 }
        );
      }
    }
    const supabase = createServerClient();
    const { data: updatedData, error } = await supabase
      .from('offers')
      .update(data)
      .eq('id', id)
      .select('*, profiles(*)')
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedData as Offer });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE handler for removing offers
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { error } = await supabase
      .from('offers')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 