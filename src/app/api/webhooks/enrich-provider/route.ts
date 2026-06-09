import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface WebhookPayload {
  type: string;
  table: string;
  record: {
    provider_id: string;
    listing_type: string;
    provider_owner_id: string | null;
    [key: string]: unknown;
  };
  schema: string;
}

export async function POST(request: Request) {
  try {
    const webhookSecret = request.headers.get('X-Webhook-Secret');
    if (!webhookSecret || webhookSecret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const body: WebhookPayload = await request.json();

    if (body.type !== 'INSERT' || body.table !== 'providers') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const record = body.record;
    if (!record?.provider_id) {
      return NextResponse.json({ error: 'Missing provider_id' }, { status: 400 });
    }

    if (record.listing_type !== 'food') {
      return NextResponse.json({ accepted: false, reason: 'Not a food provider' });
    }

    if (record.provider_owner_id != null) {
      return NextResponse.json({ accepted: false, reason: 'Provider has an owner' });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { error } = await supabase.from('pending_enrichments').insert({
      provider_id: record.provider_id,
      status: 'pending',
      source: null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to enqueue provider for enrichment:', error.message);
    }

    return NextResponse.json({ accepted: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Webhook handler error:', message);
    return NextResponse.json({ accepted: true });
  }
}
