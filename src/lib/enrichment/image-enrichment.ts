export interface ImageAttribution {
  photographer: string;
  profile_url: string;
  photo_url: string;
}

export interface ImageCandidatePayloadInput {
  providerId: string;
  imageUrl: string;
  sourceCategory: string;
  attribution: ImageAttribution;
  currentUrls: string[];
}

export interface ImageCandidatePayload {
  provider_id: string;
  source: 'unsplash';
  source_service: 'unsplash';
  source_category: string;
  field_name: 'provider_images';
  enrichment_type: 'image';
  image_url: string;
  proposed_value: { urls: string[] };
  current_value: { urls: string[] };
  attribution: ImageAttribution;
}

export const DEFAULT_CATEGORY_ID = '5e5d910d-d790-4184-a061-9cd74d0950e8';

export const CATEGORY_IMAGE_POOL: Record<string, [string, string, string]> = {
  '21e8a577-f42c-499d-a277-0b8ba327c00b': [
    'classroom teaching',
    'library study',
    'tutoring session',
  ],
  '20c10efe-404b-4a39-bb81-5089a0332d78': [
    'halal restaurant interior',
    'mediterranean food table',
    'kebab restaurant',
  ],
  'b43ba9ba-965e-46f8-a97e-c76d352c2ff0': [
    'craftsman workshop',
    'repair tools workbench',
    'artisan handwork',
  ],
  '5e5d910d-d790-4184-a061-9cd74d0950e8': [
    'small business storefront',
    'local shop interior',
    'business owner portrait',
  ],
  '8204a370-26fb-4c8d-8183-2e5550a09dcb': [
    'afghan food kabuli',
    'afghan restaurant',
    'mantu afghan dish',
  ],
  'a8d3cf09-b606-4de9-8744-b8c584c5e172': [
    'arabic food mezze',
    'shawarma restaurant',
    'middle eastern cuisine',
  ],
  'd2cef2bf-bd0b-4b54-8606-ac371a1e1588': [
    'balkan grill cevapi',
    'balkan restaurant food',
    'bosnian cuisine',
  ],
  '7ef6672b-97a2-4078-9d04-6ad1db6bac28': [
    'german restaurant interior',
    'schnitzel food',
    'german beer garden food',
  ],
  'f0118e0e-1b6d-4691-b5d9-aa1a5c2aa9ae': [
    'indian curry biryani',
    'pakistani restaurant',
    'tandoori food',
  ],
  'b35965ed-fdb0-4bc5-a872-ab3bbc5139de': [
    'italian pizza restaurant',
    'pasta fresh italian',
    'italian trattoria',
  ],
  'd6812686-a908-43a5-9621-845a69ead77d': [
    'moroccan tagine food',
    'couscous north african',
    'tunisian cuisine',
  ],
  '611dd280-59d7-4996-a4e1-046c0ddfe6b6': [
    'east african food injera',
    'somali restaurant',
    'ethiopian cuisine',
  ],
  'b39cf9f5-fb5d-4e17-bc1a-2d379e130e82': [
    'persian rice saffron',
    'iranian restaurant',
    'persian kebab food',
  ],
  'f577c7ce-d2e2-46ba-b494-57b038aa4b48': [
    'thai food pad thai',
    'indonesian nasi goreng',
    'malaysian curry',
  ],
  '232c2870-7929-43eb-a909-6cac90203192': [
    'turkish kebab doner',
    'turkish breakfast spread',
    'turkish restaurant interior',
  ],
  '93808e5e-c124-4dc7-a107-9867cc708a52': [
    'west african jollof rice',
    'nigerian food',
    'senegalese cuisine',
  ],
  '1288f269-2cdb-47e8-bd8e-9d552ff25e83': [
    'professional office meeting',
    'business consultation',
    'coworking space',
  ],
  'df8e549d-54c4-48ef-8e0b-c5a6646fcb7d': [
    'fitness gym interior',
    'wellness spa',
    'sports training',
  ],
  '49563bf0-6962-4fd8-9147-5e68e9310eb1': [
    'fashion boutique display',
    'modest fashion hijab',
    'clothing store interior',
  ],
  '4470c3e0-458f-40a6-a96e-ca0fbdf145d7': [
    'community volunteers',
    'charity donation hands',
    'mosque community gathering',
  ],
};

export function resolveCategoryImageQueries(categoryId: string | null | undefined): string[] {
  const resolvedCategoryId = categoryId && CATEGORY_IMAGE_POOL[categoryId] ? categoryId : DEFAULT_CATEGORY_ID;
  return [...CATEGORY_IMAGE_POOL[resolvedCategoryId]];
}

export function selectDeterministicPoolImage(providerId: string, imagePool: string[]): string {
  if (imagePool.length === 0) {
    throw new Error('Image pool cannot be empty');
  }

  let hash = 0;
  for (let i = 0; i < providerId.length; i++) {
    hash = (hash << 5) - hash + providerId.charCodeAt(i);
    hash |= 0;
  }

  const index = Math.abs(hash) % imagePool.length;
  return imagePool[index];
}

export function createImageCandidatePayload(
  input: ImageCandidatePayloadInput
): ImageCandidatePayload {
  const mergedUrls = Array.from(new Set([...input.currentUrls, input.imageUrl]));

  return {
    provider_id: input.providerId,
    source: 'unsplash',
    source_service: 'unsplash',
    source_category: input.sourceCategory,
    field_name: 'provider_images',
    enrichment_type: 'image',
    image_url: input.imageUrl,
    proposed_value: { urls: mergedUrls },
    current_value: { urls: input.currentUrls },
    attribution: input.attribution,
  };
}