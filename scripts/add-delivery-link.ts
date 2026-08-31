import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables.');
  console.error('  NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

function extractSlug(url: string, platform: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.replace(/\/$/, '').split('/');

    if (platform === 'wolt') {
      const venueIdx = segments.indexOf('venue');
      if (venueIdx >= 0 && venueIdx + 1 < segments.length) {
        return segments[venueIdx + 1];
      }
    }

    return segments[segments.length - 1] || '';
  } catch {
    return '';
  }
}

const args = process.argv.slice(2);

function getArgValue(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

const providerId = getArgValue('--provider-id');
const platform = getArgValue('--platform');
const url = getArgValue('--url');
const explicitSlug = getArgValue('--slug');

if (!providerId || !platform || !url) {
  console.error('Usage: npx tsx scripts/add-delivery-link.ts \\');
  console.error('  --provider-id <uuid> --platform wolt|lieferando|ubereats --url <url> [--slug <slug>]');
  process.exit(1);
}

if (!['wolt', 'lieferando', 'ubereats'].includes(platform)) {
  console.error('Invalid platform. Must be one of: wolt, lieferando, ubereats');
  process.exit(1);
}

const slug = explicitSlug || extractSlug(url, platform);

async function main(): Promise<void> {
  const { data: provider, error: provError } = await supabase
    .from('providers')
    .select('provider_id, provider_name')
    .eq('provider_id', providerId)
    .single();

  if (provError || !provider) {
    console.error(`Provider not found: ${provError?.message || 'No matching provider'}`);
    process.exit(1);
  }

  const { error: upsertError } = await supabase
    .from('provider_delivery_links')
    .upsert(
      {
        provider_id: providerId,
        platform,
        platform_url: url,
        platform_slug: slug || null,
        is_active: true,
        last_verified_at: new Date().toISOString(),
      },
      { onConflict: 'provider_id,platform' }
    );

  if (upsertError) {
    console.error(`Failed to add delivery link: ${upsertError.message}`);
    process.exit(1);
  }

  console.log(`Added ${platform} link for ${provider.provider_name}: ${url}`);
  if (slug) {
    console.log(`  Slug: ${slug}`);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
