/* global console, process */
/**
 * Plan 122 — M1: Upload category images to Supabase Storage.
 *
 * Converts PNGs in public/images/categories/food/ to WebP (via cwebp),
 * then uploads to the category-images bucket organised by category_id.
 *
 * Usage (from project root):
 *   node scripts/upload-category-images.mjs
 *
 * Requires: cwebp on PATH, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
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
const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// ─── Upload mapping (D9: American images skipped) ───────────────────────────
const CATEGORIES = [
  {
    name: 'Turkish',
    categoryId: '232c2870-7929-43eb-a909-6cac90203192',
    srcFolder: 'food/turkish',
    count: 8,
  },
  {
    name: 'Arabic',
    categoryId: 'a8d3cf09-b606-4de9-8744-b8c584c5e172',
    srcFolder: 'food/arabic',
    count: 6,
  },
  {
    name: 'Italian',
    categoryId: 'b35965ed-fdb0-4bc5-a872-ab3bbc5139de',
    srcFolder: 'food/italian',
    count: 4,
  },
];

const BUCKET = 'category-images';
const WEBP_QUALITY = 85;

// ─── Main ────────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const tmpDir = mkdtempSync(join(tmpdir(), 'uflow-category-images-'));

console.log(`\n📦 Plan 122 — Category image upload`);
console.log(`   Supabase: ${SUPABASE_URL}`);
console.log(`   Bucket:   ${BUCKET}`);
console.log(`   Temp dir: ${tmpDir}\n`);

const uploadedUrls = {};

try {
  for (const category of CATEGORIES) {
    console.log(`\n▶ ${category.name} (${category.count} images)`);
    const urls = [];

    for (let i = 1; i <= category.count; i++) {
      const srcPng = join(ROOT, 'public', 'images', 'categories', category.srcFolder, `${i}.png`);
      const webpFile = join(tmpDir, `${category.categoryId}_${i}.webp`);
      const storagePath = `${category.categoryId}/${i}.webp`;

      // Convert PNG → WebP
      execSync(`cwebp -q ${WEBP_QUALITY} -resize 512 0 "${srcPng}" -o "${webpFile}"`, {
        stdio: 'pipe',
      });

      const webpBytes = readFileSync(webpFile);

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
} finally {
  rmSync(tmpDir, { recursive: true, force: true });
}
