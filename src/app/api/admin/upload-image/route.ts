import { NextResponse } from 'next/server';
import { isAdminOrModerator } from '@/lib/auth/roles';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * POST /api/admin/upload-image
 *
 * Upload a provider image as admin/moderator (bypasses storage RLS).
 * Accepts multipart/form-data with a single "file" field.
 * Returns the public URL of the uploaded image.
 */
export async function POST(request: Request) {
  try {
    const { getUserFromCookie } = await import('@/lib/supabase/getUserFromCookie');
    const user = await getUserFromCookie();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await isAdminOrModerator(user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const fileExt = file.name.split('.').pop();
    const fileName = `providers/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('provider-images')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Admin image upload error:', uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: { publicUrl } } = supabase.storage
      .from('provider-images')
      .getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Admin image upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
