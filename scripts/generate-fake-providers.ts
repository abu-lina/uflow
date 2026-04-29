/**
 * Script to generate fake provider test data
 * 
 * This script generates realistic fake providers using Faker.js and inserts them into the database.
 * 
 * Usage: 
 *   npx tsx scripts/generate-fake-providers.ts [count] [city]
 * 
 * Examples:
 *   npx tsx scripts/generate-fake-providers.ts 10              # Generate 10 providers (random cities)
 *   npx tsx scripts/generate-fake-providers.ts 10 Stuttgart    # Generate 10 providers in Stuttgart
 *   npx tsx scripts/generate-fake-providers.ts                # Generate 5 providers (default, random cities)
 */

import { faker } from '@faker-js/faker';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('   Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Category {
  category_id: string;
  name_de: string;
}

interface Offer {
  offer_id: string;
  name_de: string;
}

interface Need {
  need_id: string;
  name_de: string;
}

interface FakeProvider {
  provider_name: string;
  provider_description: string | null;
  provider_images: string | null;
  category_id: string | null;
  address_street: string | null;
  address_zip: string | null;
  address_city: string | null;
  address_country: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  contact_email: string | null;
  contact_phone: string | null;
  social_website: string | null;
  social_instagram: string | null;
  provider_owner_id: string | null;
  user_created_id: string | null;
  review_status: 'pending' | 'approved' | 'rejected';
  review_feedback: string | null;
  offers_ids: string[];
  needs_ids: string[];
  show_address: boolean;
}

async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('category_id, name_de')
    .order('name_de', { ascending: true });

  if (error) {
    console.error('❌ Error fetching categories:', error);
    throw error;
  }

  return data || [];
}

async function fetchOffers(): Promise<Offer[]> {
  const { data, error } = await supabase
    .from('offers')
    .select('offer_id, name_de')
    .order('name_de', { ascending: true });

  if (error) {
    console.error('❌ Error fetching offers:', error);
    throw error;
  }

  return data || [];
}

async function fetchNeeds(): Promise<Need[]> {
  const { data, error } = await supabase
    .from('needs')
    .select('need_id, name_de')
    .order('name_de', { ascending: true });

  if (error) {
    console.error('❌ Error fetching needs:', error);
    throw error;
  }

  return data || [];
}

function generateFakeProvider(
  categories: Category[],
  offers: Offer[],
  needs: Need[],
  city?: string | null
): FakeProvider {
  // If city is specified, ensure providers have addresses (unless explicitly online)
  const isOnlineBusiness = city ? false : faker.datatype.boolean({ probability: 0.3 });
  const hasAddress = !isOnlineBusiness && (city ? true : faker.datatype.boolean({ probability: 0.8 }));
  const showAddress = hasAddress && (city ? true : faker.datatype.boolean({ probability: 0.7 }));
  
  // Random category (or null)
  const category = categories.length > 0 && faker.datatype.boolean({ probability: 0.9 })
    ? faker.helpers.arrayElement(categories)
    : null;

  // Random offers (0-3)
  const numOffers = faker.number.int({ min: 0, max: Math.min(3, offers.length) });
  const selectedOffers = faker.helpers.arrayElements(offers, numOffers);

  // Random needs (0-3)
  const numNeeds = faker.number.int({ min: 0, max: Math.min(3, needs.length) });
  const selectedNeeds = faker.helpers.arrayElements(needs, numNeeds);

  // Random review status (mostly approved for testing)
  const reviewStatuses: Array<'pending' | 'approved' | 'rejected'> = ['approved', 'approved', 'approved', 'pending', 'rejected'];
  const reviewStatus = faker.helpers.arrayElement(reviewStatuses);

  // Generate location if address is shown
  let latitude: number | null = null;
  let longitude: number | null = null;
  if (hasAddress && showAddress) {
    // German coordinates (approximate: latitude 47-51, longitude 6-15)
    latitude = faker.location.latitude({ min: 47.0, max: 51.0 });
    longitude = faker.location.longitude({ min: 6.0, max: 15.0 });
  }

  // Generate contact info (sometimes missing)
  const hasEmail = faker.datatype.boolean({ probability: 0.8 });
  const hasPhone = faker.datatype.boolean({ probability: 0.7 });
  const hasWebsite = faker.datatype.boolean({ probability: 0.6 });
  const hasInstagram = faker.datatype.boolean({ probability: 0.5 });

  // German city names (used if no specific city is provided)
  const germanCities = [
    'Berlin', 'München', 'Hamburg', 'Köln', 'Frankfurt', 'Stuttgart',
    'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig', 'Bremen', 'Dresden',
    'Hannover', 'Nürnberg', 'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld',
    'Bonn', 'Münster', 'Karlsruhe', 'Mannheim', 'Augsburg', 'Wiesbaden',
    'Gelsenkirchen', 'Mönchengladbach', 'Braunschweig', 'Chemnitz', 'Kiel',
    'Aachen', 'Halle', 'Magdeburg', 'Freiburg', 'Krefeld', 'Lübeck',
  ];

  // Use specified city or random selection
  // If city is specified, all providers with addresses should use it
  const selectedCity = city 
    ? (hasAddress ? city : null)  // If city specified and has address, use it
    : (hasAddress && showAddress ? faker.helpers.arrayElement(germanCities) : null);

  const provider: FakeProvider = {
    provider_name: faker.company.name(),
    provider_description: faker.datatype.boolean({ probability: 0.8 })
      ? faker.lorem.paragraph(faker.number.int({ min: 1, max: 3 }))
      : null,
    provider_images: null, // Can be added later if needed
    category_id: category?.category_id || null,
    address_street: hasAddress && showAddress ? `${faker.location.streetAddress()}` : null,
    address_zip: hasAddress && showAddress ? faker.string.numeric(5) : null,
    address_city: hasAddress && showAddress ? selectedCity : null,
    address_country: hasAddress && showAddress ? 'DE' : null,
    location_latitude: latitude,
    location_longitude: longitude,
    contact_email: hasEmail ? faker.internet.email() : null,
    contact_phone: hasPhone ? `+49${faker.string.numeric(10)}` : null,
    social_website: hasWebsite ? `https://${faker.internet.domainName()}` : null,
    social_instagram: hasInstagram ? `@${faker.internet.username()}` : null,
    provider_owner_id: null, // Can be set if you want to test ownership
    user_created_id: null, // Can be set if you want to test user tracking
    review_status: reviewStatus,
    review_feedback: reviewStatus === 'rejected' && faker.datatype.boolean({ probability: 0.5 })
      ? faker.lorem.sentence()
      : null,
    offers_ids: selectedOffers.map(o => o.offer_id),
    needs_ids: selectedNeeds.map(n => n.need_id),
    show_address: showAddress,
  };

  return provider;
}

async function generateProviders(count: number, city?: string | null) {
  const cityInfo = city ? ` in ${city}` : '';
  console.log(`\n🚀 Generating ${count} fake provider(s)${cityInfo}...\n`);

  // Fetch reference data
  console.log('📋 Fetching reference data...');
  const [categories, offers, needs] = await Promise.all([
    fetchCategories(),
    fetchOffers(),
    fetchNeeds(),
  ]);

  console.log(`   ✓ Found ${categories.length} categories`);
  console.log(`   ✓ Found ${offers.length} offers`);
  console.log(`   ✓ Found ${needs.length} needs`);
  if (city) {
    console.log(`   ✓ City: ${city}`);
  }
  console.log('');

  if (categories.length === 0) {
    console.warn('⚠️  Warning: No categories found. Providers will be created without categories.');
  }

  // Generate providers
  console.log('🎲 Generating fake providers...');
  const providers: FakeProvider[] = [];
  for (let i = 0; i < count; i++) {
    providers.push(generateFakeProvider(categories, offers, needs, city));
    process.stdout.write(`   ${i + 1}/${count}\r`);
  }
  console.log(`   ✓ Generated ${count} provider(s)\n`);

  // Insert providers
  console.log('💾 Inserting providers into database...');
  
  // Insert providers one by one to catch individual errors
  const results: Array<{ provider_name: string; provider_id?: string; review_status?: string; error?: string }> = [];
  let successCount = 0;
  let errorCount = 0;

  for (const provider of providers) {
    const { data, error } = await supabase
      .from('providers')
      .insert([provider])
      .select('provider_id, provider_name, review_status')
      .single();

    if (error) {
      errorCount++;
      results.push({
        provider_name: provider.provider_name,
        error: error.message,
      });
      console.error(`   ❌ Failed: ${provider.provider_name} - ${error.message}`);
    } else if (data) {
      successCount++;
      results.push({
        provider_name: data.provider_name,
        provider_id: data.provider_id,
        review_status: data.review_status,
      });
    }
  }

  console.log(`\n✅ Successfully created ${successCount} provider(s)!`);
  if (errorCount > 0) {
    console.log(`❌ Failed to create ${errorCount} provider(s)\n`);
  } else {
    console.log('');
  }

  // Display summary
  if (results.length > 0) {
    console.log('📊 Results:');
    let index = 1;
    results.forEach((result) => {
      if (result.error) {
        console.log(`   ${index}. ❌ ${result.provider_name}`);
        console.log(`      Error: ${result.error}`);
      } else {
        console.log(`   ${index}. ✅ ${result.provider_name} (${result.review_status})`);
        console.log(`      ID: ${result.provider_id}`);
      }
      index++;
    });
    console.log('');
  }

  return results.filter(r => !r.error);
}

// Main execution
async function main() {
  try {
    const countArg = process.argv[2];
    const cityArg = process.argv[3];
    
    // Parse count (first argument)
    const count = countArg ? parseInt(countArg, 10) : 5;
    
    if (isNaN(count) || count < 1) {
      console.error('❌ Error: Count must be a positive number');
      console.error('   Usage: npx tsx scripts/generate-fake-providers.ts [count] [city]');
      console.error('   Examples:');
      console.error('     npx tsx scripts/generate-fake-providers.ts 10');
      console.error('     npx tsx scripts/generate-fake-providers.ts 10 Stuttgart');
      process.exit(1);
    }

    // Parse city (second argument, optional)
    const city = cityArg && cityArg.trim() !== '' ? cityArg.trim() : null;

    if (count > 100) {
      console.warn('⚠️  Warning: Generating more than 100 providers may take a while.');
      console.warn('   Consider generating in smaller batches.\n');
    }

    await generateProviders(count, city);
    console.log('✅ Done!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  void main();
}

export { generateProviders, generateFakeProvider };
