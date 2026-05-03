/* global console, process */
/**
 * Category image upload operator script.
 *
 * Drop PNG/JPG/WebP images into  imports/category-images/{Category Name}/
 * then run this script. It will:
 *   1. Look up the category_id from the DB by name (case-insensitive)
 *   2. Convert all images to WebP using sharp
 *   3. Upload numbered files (1.webp, 2.webp …) to Supabase Storage
 *   4. Update categories.category_images JSONB in the database
 *
 * Usage (from project root):
 *   node scripts/upload-category-images.mjs
 *
 * For production, supply credentials explicitly:
 *   SUPABASE_URL=https://rdtdtcfntopcxcigkqoq.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
 *   node scripts/upload-category-images.mjs
 *
 * Folder structure example:
 *   imports/category-images/
 *     Afghan/
 *       photo1.jpg
 *       photo2.jpg
 *     Indian-Pakistani/
 *       1.png
 *       2.png
 *
 * The script is idempotent — safe to re-run.
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve, dirname, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

// ─── Resolve project root ───────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Load env ───────────────────────────────────────────────────────────────
const envPath = join(ROOT, '.env.local');
const envContent = existsSync(envPath) ? readFileSync(envPath, 'utf-8') : '';
function getEnv(key) {
  if (!envContent) return null;
  const match = envContent.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return match ? match[1].trim() : null;
}
const SUPABASE_URL = process.env.SUPABASE_URL || getEnv('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (provide env vars or .env.local values)',
  );
  process.exit(1);
}

const BUCKET = 'category-images';
const SOURCE_DIR = join(ROOT, 'imports', 'category-images');
const SUPPORTED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif']);

// ─── Main ────────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

console.log(`\n📦 Category image upload`);
console.log(`   Supabase: ${SUPABASE_URL}`);
console.log(`   Source:   ${SOURCE_DIR}\n`);

if (!existsSync(SOURCE_DIR)) {
  console.error(`ERROR: Source folder not found: ${SOURCE_DIR}`);
  console.error(`Create it and add subfolders named after categories (e.g. imports/category-images/Afghan/)`);
  process.exit(1);
}

// ─── Discover category folders ───────────────────────────────────────────────
const categoryFolders = readdirSync(SOURCE_DIR).filter((name) => {
  const full = join(SOURCE_DIR, name);
  return statSync(full).isDirectory() && !name.startsWith('.');
});

if (categoryFolders.length === 0) {
  console.log('No category folders found in imports/category-images/ — nothing to do.');
  process.exit(0);
}

// ─── Load category name → id map from DB ─────────────────────────────────────
const { data: categoryRows, error: catErr } = await supabase
  .from('categories')
  .select('category_id, name_en');

if (catErr) {
  console.error('ERROR: Could not fetch categories from DB:', catErr.message);
  process.exit(1);
}

const nameToId = Object.fromEntries(
  categoryRows.map((r) => [r.name_en.toLowerCase(), r.category_id]),
);

// ─── Process each folder ──────────────────────────────────────────────────────
let totalUploaded = 0;
let totalErrors = 0;

for (const folderName of categoryFolders) {
  const categoryId = nameToId[folderName.toLowerCase()];

  if (!categoryId) {
    console.warn(`⚠  "${folderName}" — no matching category in DB (check spelling). Skipping.`);
    totalErrors++;
    continue;
  }

  const folderPath = join(SOURCE_DIR, folderName);
  const imageFiles = readdirSync(folderPath)
    .filter((f) => SUPPORTED_EXT.has(extname(f).toLowerCase()) && !f.startsWith('.'))
    .sort(); // alphabetical → deterministic numbering

  if (imageFiles.length === 0) {
    console.warn(`⚠  "${folderName}" — folder is empty. Skipping.`);
    continue;
  }

  console.log(`\n▶ ${folderName} → ${categoryId} (${imageFiles.length} image(s))`);
  const urls = [];

  for (let i = 0; i < imageFiles.length; i++) {
    const srcFile = join(folderPath, imageFiles[i]);
    const storagePath = `${categoryId}/${i + 1}.webp`;

    // Convert to WebP (sharp handles PNG, JPG, WebP, AVIF input transparently)
    const webpBytes = await sharp(srcFile)
      .webp({ quality: 85 })
      .toBuffer();

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, webpBytes, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (error) {
      console.error(`  ✗ ${basename(srcFile)} → ${storagePath}: ${error.message}`);
      totalErrors++;
      continue;
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
    urls.push(publicUrl);
    console.log(`  ✓ ${basename(srcFile)} → ${storagePath}`);
    totalUploaded++;
  }

  if (urls.length === 0) continue;

  // ─── Update categories.category_images JSONB ───────────────────────────────
  const { error: updateErr } = await supabase
    .from('categories')
    .update({ category_images: { urls } })
    .eq('category_id', categoryId);

  if (updateErr) {
    console.error(`  ✗ DB update failed for ${folderName}: ${updateErr.message}`);
    totalErrors++;
  } else {
    console.log(`  ✓ DB updated (${urls.length} URLs in category_images)`);
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${totalErrors === 0 ? '✅' : '⚠ '} Done — ${totalUploaded} file(s) uploaded, ${totalErrors} error(s).`);
if (totalErrors > 0) process.exit(1);
