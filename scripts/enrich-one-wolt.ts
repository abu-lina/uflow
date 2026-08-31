/**
 * One-shot: enrich a single provider from a Wolt URL via Apify.
 * Usage: npx tsx scripts/enrich-one-wolt.ts <provider-id> <wolt-url>
 *
 * Skips all the overhead of the full workflow — just the Apify call + DB write.
 */
import { createClient } from '@supabase/supabase-js';
import { fetchWoltRestaurant } from '../src/lib/enrichment/delivery-platform/apify-wolt-client';

const [providerId, woltUrl] = process.argv.slice(2);
if (!providerId || !woltUrl) {
  console.error('Usage: npx tsx scripts/enrich-one-wolt.ts <provider-id> <wolt-url>');
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !APIFY_TOKEN) {
  console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APIFY_API_TOKEN');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log(`Fetching ${woltUrl} from Apify...`);
  const result = await fetchWoltRestaurant(woltUrl, APIFY_TOKEN!);

  if (!result) {
    console.error('Restaurant not found on Wolt');
    process.exit(1);
  }

  console.log(`  Menu items: ${result.menuItems.length}`);
  console.log(`  Opening hours: ${result.openingHours ? 'yes' : 'no'}`);

  const p_data: Record<string, unknown> = { menu_items: result.menuItems };
  if (result.openingHours) {
    p_data.providers = { opening_hours: result.openingHours };
  }

  const { error: rpcError } = await supabase
    .rpc('admin_update_provider', {
      p_provider_id: providerId,
      p_data,
    });

  if (rpcError) {
    console.error(`RPC write failed: ${rpcError.message}`);
    process.exit(1);
  }

  // Update delivery link verified timestamp
  await supabase
    .from('provider_delivery_links')
    .update({
      last_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('provider_id', providerId)
    .eq('platform', 'wolt');

  console.log(`✅ Done — ${result.menuItems.length} menu items + opening hours written`);

  // Verify
  const { count: verifyCount } = await supabase
    .from('food_menu')
    .select('*', { count: 'exact', head: true })
    .eq('provider_id', providerId);
  console.log(`  Verified: ${verifyCount} menu item(s) in food_menu for this provider`);

  const { data: verifyProvider } = await supabase
    .from('providers')
    .select('opening_hours')
    .eq('provider_id', providerId)
    .single();
  console.log(`  Opening hours stored: ${verifyProvider?.opening_hours != null}`);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
