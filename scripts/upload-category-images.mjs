/* global console, process */
/**
 * Plan 122 — M1: Upload category images to Supabase Storage.
 *
 * Mirrors already-converted WebP category images from a source Storage bucket
 * into the target project's `category-images` bucket, organised by category_id.
 *
 * This design is executable even after deleting local static PNG assets.
 *
 * Usage (from project root):
 *   # Default target from .env.local, source = dev ref
 *   node scripts/upload-category-images.mjs
 *
 *   # Target production explicitly
 *   SUPABASE_URL=https://rdtdtcfntopcxcigkqoq.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
 *   node scripts/upload-category-images.mjs
 *
 * Optional override:
 *   SOURCE_STORAGE_BASE=https://qrekonfhaenjdnjhwdum.supabase.co/storage/v1/object/public/category-images
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ─── Resolve project root ───────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Load env ───────────────────────────────────────────────────────────────
const envPath = join(ROOT, '.env.local');
if (!existsSync(envPath)) {
  console.error('ERROR: .env.local not found at', envPath);
  process.exit(1);
}
const envContent = readFileSync(envPath, 'utf-8');
function getEnv(key) {
  const match = envContent.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return match ? match[1].trim() : null;
}
const SUPABASE_URL = process.env.SUPABASE_URL || getEnv('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || getEnv('SUPABASE_SERVICE_ROLE_KEY');
const SOURCE_STORAGE_BASE =
  process.env.SOURCE_STORAGE_BASE ||
  'https://qrekonfhaenjdnjhwdum.supabase.co/storage/v1/object/public/category-images';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// ─── Upload mapping (D9: American images skipped) ───────────────────────────
const CATEGORIES = [
  {
    name: 'Turkish',
    categoryId: '232c2870-7929-43eb-a909-6cac90203192',
    count: 8,
  },
  {
    name: 'Arabic',
    categoryId: 'a8d3cf09-b606-4de9-8744-b8c584c5e172',
    count: 6,
  },
  {
    name: 'Italian',
    categoryId: 'b35965ed-fdb0-4bc5-a872-ab3bbc5139de',
    count: 4,
  },
];

const BUCKET = 'category-images';

// ─── Main ────────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

console.log(`\n📦 Plan 122 — Category image upload`);
console.log(`   Supabase: ${SUPABASE_URL}`);
console.log(`   Bucket:   ${BUCKET}`);
console.log(`   Source:   ${SOURCE_STORAGE_BASE}\n`);

const uploadedUrls = {};

for (const category of CATEGORIES) {
  console.log(`\n▶ ${category.name} (${category.count} images)`);
  const urls = [];

  for (let i = 1; i <= category.count; i++) {
    const storagePath = `${category.categoryId}/${i}.webp`;
    const sourceUrl = `${SOURCE_STORAGE_BASE}/${storagePath}`;

    const sourceResponse = await globalThis.fetch(sourceUrl);
    if (!sourceResponse.ok) {
      console.error(`  ✗ source fetch failed ${sourceUrl} (HTTP ${sourceResponse.status})`);
      process.exit(1);
    }

    const webpBytes = new Uint8Array(await sourceResponse.arrayBuffer());

    // Upload to Supabase Storage (upsert = overwrite if already exists)
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, webpBytes, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (error) {
      console.error(`  ✗ ${storagePath}: ${error.message}`);
      process.exit(1);
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
    urls.push(publicUrl);
    console.log(`  ✓ ${storagePath}`);
  }

  uploadedUrls[category.name] = { categoryId: category.categoryId, urls };
}

console.log('\n\n✅ Upload complete. SQL for M2:\n');
for (const [name, { categoryId, urls }] of Object.entries(uploadedUrls)) {
  const jsonb = JSON.stringify({ urls });
  console.log(`-- ${name}`);
  console.log(
    `UPDATE categories SET category_images = '${jsonb}' WHERE category_id = '${categoryId}';\n`,
  );
}
