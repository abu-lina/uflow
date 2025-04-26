import { createServerClient } from '@/lib/database/supabase-server';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/database';

type Souk = Database['public']['Tables']['souks']['Row'];

// NOTE: This endpoint relies on Supabase RLS for access control.
// Only authorized users (per RLS) can create/update/delete souks.
// Do not trust user_id or souk_owner_id from the client.

// GET handler for fetching souks
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const supabase = createServerClient();

    if (id) {
      // Fetch single souk
      const { data, error } = await supabase
        .from('souks')
        .select('*')
        .eq('souk_id', id)
        .single();

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: error.code === 'PGRST116' ? 404 : 500 }
        );
      }

      return NextResponse.json({ data: data as Souk });
    } else {
      // Fetch all souks with optional filtering
      const category = searchParams.get('category');
      const search = searchParams.get('search');
      const sort = searchParams.get('sort');
      const page = parseInt(searchParams.get('page') || '1');
      const pageSize = parseInt(searchParams.get('pageSize') || '10');

      let query = supabase.from('souks').select('*', { count: 'exact' });

      if (category) {
        query = query.eq('category_id', category);
      }

      if (search) {
        query = query.ilike('souk_name', `%${search}%`);
      }

      if (sort) {
        switch (sort) {
          case 'popular':
            query = query.order('souk_view_count', { ascending: false });
            break;
          case 'newest':
            query = query.order('created_at', { ascending: false });
            break;
        }
      }

      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;
      query = query.range(start, end);

      const { data, error, count } = await query;

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        data: data as Souk[],
        pagination: {
          page,
          pageSize,
          total: count || 0,
          totalPages: count ? Math.ceil(count / pageSize) : 0
        }
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

// POST handler for creating souks
export async function POST(request: Request) {
  try {
    const data = await request.json();
    // Validate required fields for POST
    const requiredFields = ['souk_id', 'souk_owner_id', 'souk_name', 'address_street', 'address_zip', 'address_country'];
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
      .from('souks')
      .insert(data)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: insertedData as Souk });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PATCH handler for updating souks
export async function PATCH(request: Request) {
  try {
    const { id, data } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'souk_id is required' },
        { status: 400 }
      );
    }

    // Validate required fields for PATCH
    const requiredFields = ['souk_owner_id', 'souk_name', 'address_street', 'address_zip', 'address_country'];
    for (const field of requiredFields) {
      if (data[field] === undefined) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const supabase = createServerClient();
    const { data: updatedData, error } = await supabase
      .from('souks')
      .update(data)
      .eq('souk_id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedData as Souk });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE handler for removing souks
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'souk_id is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { error } = await supabase
      .from('souks')
      .delete()
      .eq('souk_id', id);

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