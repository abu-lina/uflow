import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { 
  validateOutreachToken, 
  consumeToken, 
  updateOutreachStatus,
  getOutreachByProvider,
  hashToken 
} from '@/services/outreach';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, action } = body;

    // Validate request
    if (!token || !action) {
      return NextResponse.json(
        { error: 'Token and action are required' },
        { status: 400 }
      );
    }

    if (!['keep', 'remove'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "keep" or "remove"' },
        { status: 400 }
      );
    }

    // Hash and validate token
    const tokenHash = hashToken(token);
    const validationResult = await validateOutreachToken(tokenHash);

    if (!validationResult.isValid) {
      return NextResponse.json(
        { error: validationResult.errorMessage || 'Invalid token' },
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
    if (!outreach) {
      return NextResponse.json(
        { error: 'Outreach record not found' },
        { status: 404 }
      );
    }

    const supabase = getSupabaseAdmin();

    if (action === 'keep') {
      // Mark outreach as "kept" - owner wants to stay listed
      await updateOutreachStatus(outreach.id, 'kept', 'Owner chose to stay listed via landing page');
    } else if (action === 'remove') {
      // Mark outreach as "removed" and update provider
      await updateOutreachStatus(outreach.id, 'removed', 'Owner requested removal via landing page');

      // Mark provider as removed (add a field or update status)
      // Using review_status = 'removed_by_owner' convention
      const { error: updateError } = await supabase
        .from('providers')
        .update({ 
          review_status: 'removed_by_owner',
          updated_at: new Date().toISOString()
        })
        .eq('provider_id', providerId);

      if (updateError) {
        console.error('Failed to update provider:', updateError);
        // Don't fail the request - outreach status is already updated
      }
    }

    // Consume the token (single-use)
    await consumeToken(tokenHash);

    return NextResponse.json({ 
      success: true, 
      action,
      message: action === 'keep' 
        ? 'Ihr Eintrag bleibt sichtbar.' 
        : 'Ihr Eintrag wird entfernt.'
    });
  } catch (error) {
    console.error('Outreach action error:', error);
    return NextResponse.json(
      { error: 'Ein Fehler ist aufgetreten' },
      { status: 500 }
    );
  }
}
