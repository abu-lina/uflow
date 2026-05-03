import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'node:url';
import {
  CATEGORY_IMAGE_POOL,
  createImageCandidatePayload,
  DEFAULT_CATEGORY_ID,
  resolveCategoryImageQueries,
  selectDeterministicPoolImage,
  type ImageAttribution,
} from '../src/lib/enrichment/image-enrichment';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const STORAGE_BUCKET = 'provider-images';
const MANIFEST_PATH = 'enrichment/stock/pool-manifest.json';
const LOCAL_MANIFEST_PATH = path.resolve(
  process.cwd(),
  'scripts/.cache/enrichment-stock-pool-manifest.json'
);
const UNSPLASH_BASE_URL = 'https://api.unsplash.com';
const FETCH_DELAY_MS = 1400; // keeps demo-tier usage below 50/hr

type Mode = 'curate' | 'assign';

interface CliOptions {
  mode: Mode;
  isWrite: boolean;
  isDryRun: boolean;
  perCategory: number;
  providerLimit?: number;
  categoriesArg?: string;
}

interface UnsplashPhoto {
  id: string;
  urls: { raw?: string; regular?: string };
  user: { name: string; links: { html: string } };
  links: { html: string };
}

interface CuratedImage {
  photo_id: string;
  storage_path: string;
  public_url: string;
  attribution: ImageAttribution;
}

interface ManifestCategory {
  queries: string[];
  images: CuratedImage[];
}

interface PoolManifest {
  generated_at: string;
  source: 'unsplash';
  categories: Record<string, ManifestCategory>;
}

interface ProviderRow {
  provider_id: string;
  provider_name: string;
  category_id: string | null;
  provider_images: { urls?: string[] } | string[] | null;
}

type StageCandidateOutcome = 'staged' | 'skipped-existing' | 'failed';

let supabaseClient: SupabaseClient | null = null;

function getArgValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : undefined;
}

function parseCliOptions(args: string[]): CliOptions {
  const mode = args.includes('--curate') ? 'curate' : args.includes('--assign') ? 'assign' : null;

  if (!mode) {
    throw new Error(
      'Usage: npx tsx scripts/enrich-images.ts --curate [--write] [--per-category 5-10] [--categories id1,id2]\n' +
        '   or: npx tsx scripts/enrich-images.ts --assign [--write] [--limit N]'
    );
  }

  const isWrite = args.includes('--write');
  const perCategoryArg = Number(getArgValue(args, '--per-category') ?? '5');
  const perCategory = Number.isFinite(perCategoryArg) ? Math.max(5, Math.min(10, perCategoryArg)) : 5;
  const limitArg = getArgValue(args, '--limit');
  const providerLimit = limitArg ? Math.max(1, parseInt(limitArg, 10)) : undefined;

  return {
    mode,
    isWrite,
    isDryRun: !isWrite,
    perCategory,
    providerLimit,
    categoriesArg: getArgValue(args, '--categories'),
  };
}

function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  }

  supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return supabaseClient;
}

function getUnsplashAccessKey(): string {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    throw new Error('Missing required env var: UNSPLASH_ACCESS_KEY');
  }
  return key;
}

async function main(options: CliOptions): Promise<void> {
  console.log(`Image enrichment mode: ${options.mode} (${options.isDryRun ? 'dry-run' : 'write'})`);

  if (options.mode === 'curate') {
    await runCurate(options);
    return;
  }

  await runAssign(options);
}

async function runCurate(options: CliOptions): Promise<void> {
  const categories = options.categoriesArg
    ? options.categoriesArg
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    : Object.keys(CATEGORY_IMAGE_POOL);

  const invalidCategories = categories.filter((categoryId) => !(categoryId in CATEGORY_IMAGE_POOL));
  if (invalidCategories.length > 0) {
    throw new Error(`Unknown category ids in --categories: ${invalidCategories.join(', ')}`);
  }

  const estimatedSearchCalls = categories.reduce(
    (acc, categoryId) => acc + resolveCategoryImageQueries(categoryId).length,
    0
  );

  if (estimatedSearchCalls > 45) {
    throw new Error(
      `Selected categories estimate ${estimatedSearchCalls} search calls. Unsplash demo limit is 50/hour. ` +
        'Use --categories with a smaller batch (recommended <= 15 queries per run).'
    );
  }

  const manifest: PoolManifest = {
    generated_at: new Date().toISOString(),
    source: 'unsplash',
    categories: {},
  };

  let searchCalls = 0;

  for (const categoryId of categories) {
    const queries = resolveCategoryImageQueries(categoryId);
    const photoMap = new Map<string, UnsplashPhoto>();

    for (const query of queries) {
      await delay(FETCH_DELAY_MS);
      const photos = await searchUnsplash(query);
      searchCalls++;

      for (const photo of photos) {
        if (!photoMap.has(photo.id)) {
          photoMap.set(photo.id, photo);
        }
      }
    }

    const selectedPhotos = Array.from(photoMap.values()).slice(0, options.perCategory);
    const curatedImages: CuratedImage[] = [];

    for (const photo of selectedPhotos) {
      if (!options.isWrite) {
        curatedImages.push({
          photo_id: photo.id,
          storage_path: `enrichment/stock/${categoryId}/${photo.id}.webp`,
          public_url: `dry-run://provider-images/enrichment/stock/${categoryId}/${photo.id}.webp`,
          attribution: {
            photographer: photo.user.name,
            profile_url: photo.user.links.html,
            photo_url: photo.links.html,
          },
        });
        continue;
      }

      try {
        await delay(FETCH_DELAY_MS);
        await trackUnsplashDownload(photo.id);
        const uploaded = await uploadCuratedImage(categoryId, photo);
        curatedImages.push(uploaded);
      } catch (error) {
        console.warn(
          `Skipping photo ${photo.id} for category ${categoryId}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    manifest.categories[categoryId] = {
      queries,
      images: curatedImages,
    };

    console.log(`  ${categoryId}: ${curatedImages.length} curated images`);
  }

  console.log(`Unsplash search calls: ${searchCalls}`);

  if (!options.isWrite) {
    console.log('Dry-run complete. Re-run with --write to upload images and persist manifest.');
    return;
  }

  const manifestBody = JSON.stringify(manifest, null, 2);
  await mkdir(path.dirname(LOCAL_MANIFEST_PATH), { recursive: true });
  await writeFile(LOCAL_MANIFEST_PATH, manifestBody, 'utf8');

  const { error: manifestError } = await getSupabaseClient().storage
    .from(STORAGE_BUCKET)
    .upload(MANIFEST_PATH, manifestBody, {
      upsert: true,
    });

  if (manifestError) {
    console.warn(
      `Storage manifest upload failed (${manifestError.message}). Continuing with local manifest at ${LOCAL_MANIFEST_PATH}.`
    );
  }

  await insertRunLog({
    source: 'unsplash',
    triggered_by: 'cli_write',
    providers_selected: 0,
    providers_processed: 0,
    candidates_created: 0,
    unchanged_count: 0,
    failure_count: 0,
    circuit_breaker_triggered: false,
    debug_payload: {
      mode: 'curate',
      per_category: options.perCategory,
      total_categories: Object.keys(manifest.categories).length,
    },
  });

  console.log(`Manifest written locally to ${LOCAL_MANIFEST_PATH}`);
  if (!manifestError) {
    console.log('Manifest uploaded to provider-images/enrichment/stock/pool-manifest.json');
  }
}

export async function stageImageCandidate(
  client: Pick<SupabaseClient, 'from'>,
  row: Record<string, unknown>
): Promise<StageCandidateOutcome> {
  const { data: existingRows, error: existingError } = await client
    .from('enrichment_candidates')
    .select('candidate_id, status')
    .eq('provider_id', row.provider_id)
    .eq('field_name', row.field_name)
    .eq('source', row.source)
    .eq('enrichment_type', row.enrichment_type)
    .in('status', ['pending', 'approved', 'applied'])
    .limit(1);

  if (existingError) {
    return 'failed';
  }

  if (Array.isArray(existingRows) && existingRows.length > 0) {
    return 'skipped-existing';
  }

  const { error: insertError } = await client.from('enrichment_candidates').insert(row);
  if (insertError) {
    return 'failed';
  }

  return 'staged';
}

async function runAssign(options: CliOptions): Promise<void> {
  const manifest = await loadManifest();

  let query = getSupabaseClient()
    .from('providers')
    .select('provider_id, provider_name, category_id, provider_images')
    .is('provider_owner_id', null)
    .eq('review_status', 'approved')
    .or('provider_images.is.null,provider_images.eq.{"urls":[]}');

  if (options.providerLimit) {
    query = query.limit(options.providerLimit);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load providers for assign mode: ${error.message}`);
  }

  const providers = (data ?? []) as ProviderRow[];
  let staged = 0;
  let skipped = 0;

  for (const provider of providers) {
    const categoryId =
      provider.category_id && manifest.categories[provider.category_id]
        ? provider.category_id
        : DEFAULT_CATEGORY_ID;

    const categoryPool = manifest.categories[categoryId]?.images ?? [];
    if (categoryPool.length === 0) {
      skipped++;
      continue;
    }

    const selectedImage = selectDeterministicPoolImage(
      provider.provider_id,
      categoryPool.map((item) => item.public_url)
    );
    const selectedMeta = categoryPool.find((item) => item.public_url === selectedImage);

    if (!selectedMeta) {
      skipped++;
      continue;
    }

    const currentUrls = extractUrls(provider.provider_images);
    const candidate = createImageCandidatePayload({
      providerId: provider.provider_id,
      imageUrl: selectedMeta.public_url,
      sourceCategory: categoryId,
      attribution: selectedMeta.attribution,
      currentUrls,
    });

    if (!options.isWrite) {
      console.log(
        `[dry-run] ${provider.provider_name} (${provider.provider_id}) -> ${selectedMeta.public_url}`
      );
      staged++;
      continue;
    }

    const stageOutcome = await stageImageCandidate(getSupabaseClient(), {
      provider_id: candidate.provider_id,
      source: candidate.source,
      source_url: selectedMeta.attribution.photo_url,
      field_name: candidate.field_name,
      proposed_value: candidate.proposed_value,
      current_value: candidate.current_value,
      status: 'pending',
      enriched_at: new Date().toISOString(),
      enrichment_type: candidate.enrichment_type,
      image_url: candidate.image_url,
      source_service: candidate.source_service,
      source_category: candidate.source_category,
      attribution: candidate.attribution,
    });

    if (stageOutcome === 'failed') {
      console.error(`Failed to stage candidate for ${provider.provider_id}`);
      skipped++;
      continue;
    }

    if (stageOutcome === 'skipped-existing') {
      skipped++;
      continue;
    }

    staged++;
  }

  await insertRunLog({
    source: 'unsplash',
    triggered_by: options.isWrite ? 'cli_write' : 'cli_dry_run',
    providers_selected: providers.length,
    providers_processed: providers.length,
    candidates_created: staged,
    unchanged_count: 0,
    failure_count: skipped,
    circuit_breaker_triggered: false,
    debug_payload: {
      mode: 'assign',
      write: options.isWrite,
      skipped,
    },
  });

  console.log(
    `Assign complete. staged=${staged}, skipped=${skipped}, mode=${options.isWrite ? 'write' : 'dry-run'}`
  );
}

async function searchUnsplash(query: string): Promise<UnsplashPhoto[]> {
  const url = `${UNSPLASH_BASE_URL}/search/photos?query=${encodeURIComponent(
    query
  )}&per_page=10&orientation=landscape&content_filter=high`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${getUnsplashAccessKey()}`,
      'Accept-Version': 'v1',
    },
  });

  if (!response.ok) {
    throw new Error(`Unsplash search failed for "${query}": ${response.status}`);
  }

  const payload = (await response.json()) as { results?: UnsplashPhoto[] };
  return payload.results ?? [];
}

async function trackUnsplashDownload(photoId: string): Promise<void> {
  const response = await fetch(`${UNSPLASH_BASE_URL}/photos/${photoId}/download`, {
    headers: {
      Authorization: `Client-ID ${getUnsplashAccessKey()}`,
      'Accept-Version': 'v1',
    },
  });

  if (!response.ok) {
    throw new Error(`Unsplash download tracking failed for ${photoId}: ${response.status}`);
  }
}

async function uploadCuratedImage(categoryId: string, photo: UnsplashPhoto): Promise<CuratedImage> {
  const rawUrl = photo.urls.raw ?? photo.urls.regular;
  if (!rawUrl) {
    throw new Error(`Photo ${photo.id} does not contain a usable image URL`);
  }

  const optimizedUrl = `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}w=800&h=600&fit=crop&fm=webp&q=80`;
  const imageResponse = await fetch(optimizedUrl);

  if (!imageResponse.ok) {
    throw new Error(`Failed to download image ${photo.id}: ${imageResponse.status}`);
  }

  const bytes = new Uint8Array(await imageResponse.arrayBuffer());
  const storagePath = `enrichment/stock/${categoryId}/${photo.id}.webp`;

  const { error: uploadError } = await getSupabaseClient().storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, bytes, {
      upsert: true,
      contentType: 'image/webp',
    });

  if (uploadError) {
    throw new Error(`Supabase upload failed for ${storagePath}: ${uploadError.message}`);
  }

  const { data } = getSupabaseClient().storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

  return {
    photo_id: photo.id,
    storage_path: storagePath,
    public_url: data.publicUrl,
    attribution: {
      photographer: photo.user.name,
      profile_url: photo.user.links.html,
      photo_url: photo.links.html,
    },
  };
}

async function loadManifest(): Promise<PoolManifest> {
  const { data, error } = await getSupabaseClient().storage.from(STORAGE_BUCKET).download(MANIFEST_PATH);

  if (!error && data) {
    const text = await data.text();
    const parsed = JSON.parse(text) as PoolManifest;

    if (!parsed.categories || Object.keys(parsed.categories).length === 0) {
      throw new Error('Curated manifest is empty. Run --curate --write first.');
    }

    return parsed;
  }

  try {
    const localManifestText = await readFile(LOCAL_MANIFEST_PATH, 'utf8');
    const parsed = JSON.parse(localManifestText) as PoolManifest;

    if (!parsed.categories || Object.keys(parsed.categories).length === 0) {
      throw new Error('Curated local manifest is empty.');
    }

    console.warn(
      `Loaded local manifest fallback (${LOCAL_MANIFEST_PATH}) because storage manifest is unavailable.`
    );

    return parsed;
  } catch {
    throw new Error(
      `Failed to load curated manifest from storage (${MANIFEST_PATH}) and local cache (${LOCAL_MANIFEST_PATH}). Run --curate --write first.`
    );
  }
}

function extractUrls(value: ProviderRow['provider_images']): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');

  if (typeof value === 'object' && value !== null && Array.isArray(value.urls)) {
    return value.urls.filter((item): item is string => typeof item === 'string');
  }

  return [];
}

async function insertRunLog(payload: Record<string, unknown>): Promise<void> {
  const { error } = await getSupabaseClient().from('enrichment_run_logs').insert(payload);
  if (error) {
    console.warn(`Failed to insert enrichment_run_logs row: ${error.message}`);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';
const currentFile = path.resolve(fileURLToPath(import.meta.url));

if (invokedFile === currentFile) {
  const options = parseCliOptions(process.argv.slice(2));
  main(options).catch((error) => {
    console.error('Image enrichment failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
