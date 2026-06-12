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

// TODO: Kebab/Döner category was blocked from DB insertion (migration 100 line 91).
// If unblocked and inserted, add entry with queries:
//   'turkish kebab doner', 'doener kebab shop', 'kebab platter restaurant'
export const CATEGORY_IMAGE_POOL: Record<string, [string, string, string]> = {
  '062f1303-f3e4-4975-bc5a-c0f51e75701d': [
    'bakery fresh bread',
    'bakery shop display',
    'artisan bread oven',
  ],
  '0f9ed256-d3ef-47aa-991c-d2bc4119219d': [
    'dessert platter sweets',
    'ice cream scoops colorful',
    'pastry display bakery',
  ],
  '11ebc505-64bb-4021-8ff9-13c4e634827e': [
    'uyghur cuisine laghman',
    'central asian food',
    'samsa uyghur pastry',
  ],
  '12671354-0c9a-4312-9648-7556d81d9e97': [
    'stationery store display',
    'office supplies organized',
    'art supply shop',
  ],
  '1288f269-2cdb-47e8-bd8e-9d552ff25e83': [
    'professional office meeting',
    'business consultation',
    'coworking space',
  ],
  '12ca550a-62b3-464a-984c-5f3e8ac547dc': [
    'west african jollof rice',
    'nigerian food',
    'senegalese cuisine',
  ],
  '20c10efe-404b-4a39-bb81-5089a0332d78': [
    'halal restaurant interior',
    'mediterranean food table',
    'kebab restaurant',
  ],
  '21e8a577-f42c-499d-a277-0b8ba327c00b': [
    'classroom teaching',
    'library study',
    'tutoring session',
  ],
  '2c806e77-2b96-4126-9551-2789e17d5fd8': [
    'gourmet sandwich deli',
    'fresh sandwich ingredients',
    'sandwich shop counter',
  ],
  '2ee3929e-acc4-44eb-b93c-7714496927a9': [
    'vegetarian food spread',
    'colorful vegetables fresh',
    'plant based meal bowl',
  ],
  '36f70529-254c-40b2-8b93-fbb5693df68a': [
    'greek food platter',
    'greek taverna interior',
    'mediterranean meze spread',
  ],
  '414bb2e2-4a82-4e4c-a6b8-f75d9056b43b': [
    'italian pasta fresh',
    'italian pizza restaurant',
    'italian trattoria interior',
  ],
  '428d18d2-b016-4b26-93e2-5a1c627945d7': [
    'sushi platter fresh',
    'japanese sushi chef',
    'sushi restaurant counter',
  ],
  '4470c3e0-458f-40a6-a96e-ca0fbdf145d7': [
    'community volunteers',
    'charity donation hands',
    'mosque community gathering',
  ],
  '482d6624-a071-447e-b503-cdfbbdca8cd1': [
    'chinese cuisine stir fry',
    'chinese restaurant interior',
    'asian noodle dish',
  ],
  '486dad69-d36b-44f7-adb8-16bb0fe95763': [
    'gourmet burger fries',
    'burger restaurant interior',
    'smashed burger grill',
  ],
  '48fa5d40-bd93-444c-b32a-d929dda82fad': [
    'gift shop display',
    'home decor store',
    'artisan craft market',
  ],
  '49563bf0-6962-4fd8-9147-5e68e9310eb1': [
    'fashion boutique display',
    'modest fashion hijab',
    'clothing store interior',
  ],
  '4a0979fb-61ca-46d6-9af4-3a76e0ede96b': [
    'bbq grill platter',
    'barbecue smoke meat',
    'outdoor grilling food',
  ],
  '4aa30403-895a-4d68-b617-6882c0a20adf': [
    'moroccan tagine food',
    'couscous north african',
    'tunisian cuisine',
  ],
  '51a40e1d-fbce-418a-ab0e-ad695fd44a15': [
    'fresh pasta handmade',
    'pasta dish italian',
    'pasta restaurant kitchen',
  ],
  '549ee1f0-a2fb-4c05-b548-0e702456ea16': [
    'persian rice saffron',
    'iranian restaurant',
    'persian kebab food',
  ],
  '5a8b8bb7-502f-43bc-9819-539d53369c82': [
    'cosmetics store display',
    'skincare products natural',
    'beauty shop interior',
  ],
  '5e5d910d-d790-4184-a061-9cd74d0950e8': [
    'small business storefront',
    'local shop interior',
    'business owner portrait',
  ],
  '6507aea0-cff2-4804-82c6-422e57fbeaaa': [
    'grocery store fresh produce',
    'supermarket aisle display',
    'halal grocery market',
  ],
  '65a3e4e8-5dac-41a9-94c4-f65b33c6e59b': [
    'turkish kebab doner',
    'turkish breakfast spread',
    'turkish restaurant interior',
  ],
  '678e44ce-521f-4397-bb0b-018176622a59': [
    'cake display bakery',
    'cafe interior cozy',
    'coffee and cake table',
  ],
  '7acbb5e6-703c-4fd1-8f2f-676d2f0f2db9': [
    'vegan food bowl',
    'plant based cuisine',
    'vegan ingredients fresh',
  ],
  '7da24ba3-8fb1-4fbb-a113-8f00b011f189': [
    'bookstore interior cozy',
    'bookshelf display library',
    'bookshop reading nook',
  ],
  '8204a370-26fb-4c8d-8183-2e5550a09dcb': [
    'afghan food kabuli',
    'afghan restaurant',
    'mantu afghan dish',
  ],
  '8550d193-5623-49da-b8c9-1187f8fe5e6c': [
    'east african food injera',
    'somali restaurant',
    'ethiopian cuisine',
  ],
  '88a8d687-f670-4bee-9d16-f762f2f07fa8': [
    'home decor display',
    'household goods store',
    'interior design showroom',
  ],
  '88d60ec2-497e-40ea-bce7-9c1ec8b4d007': [
    'balkan grill cevapi',
    'balkan restaurant food',
    'bosnian cuisine',
  ],
  '8c0bad33-ebc9-4cc7-b3cf-237453fc8498': [
    'arabic food mezze',
    'shawarma restaurant',
    'middle eastern cuisine',
  ],
  '8d95591e-0228-4164-9603-d08d724b60b4': [
    'fried chicken crispy',
    'chicken wings platter',
    'fried chicken restaurant',
  ],
  '90c2c997-2d06-454b-84ae-2afe5ec7c5af': [
    'baby store display',
    'childrens clothing shop',
    'nursery decor items',
  ],
  '9a7971c1-8d86-42c8-b668-e232487b90dc': [
    'french cuisine plated',
    'french bakery pastry display',
    'parisian bistro interior',
  ],
  '9eef8348-dd0f-4abe-80c4-66e177bfa0e0': [
    'pakistani cuisine biryani',
    'pakistani food platter',
    'karahi dish pakistani',
  ],
  'a5c07a6b-0de8-45e8-8c01-2b3b696e6d2e': [
    'american diner interior',
    'classic burgers fries',
    'american comfort food',
  ],
  'a798fc0d-1160-4773-8a93-7a21266921b0': [
    'breakfast brunch spread',
    'brunch table setting',
    'cafe breakfast sunny',
  ],
  'ae5cdad6-7a43-448f-a01f-c33040dd1a21': [
    'japanese ramen bowl',
    'japanese sushi platter',
    'japanese izakaya interior',
  ],
  'b02b28bc-b0ef-44f0-9df0-b8c737c5f253': [
    'thai curry dish',
    'thai street food vendor',
    'thai restaurant interior',
  ],
  'b43ba9ba-965e-46f8-a97e-c76d352c2ff0': [
    'craftsman workshop',
    'repair tools workbench',
    'artisan handwork',
  ],
  'cd11b30c-cad9-4833-b50f-7dd8437fa5e9': [
    'pizza fresh baked',
    'pizzeria restaurant interior',
    'neapolitan pizza oven',
  ],
  'd69e5008-2d9e-483c-86b7-1da2d81f9ff8': [
    'mediterranean food spread',
    'mediterranean restaurant terrace',
    'olive oil fresh herbs',
  ],
  'd93f316c-c786-4310-87b8-e6bd2f01b887': [
    'mexican tacos spread',
    'wrap sandwich fresh',
    'burrito bowl ingredients',
  ],
  'd9e09fbc-9b17-4ef1-b057-14c6d8fbf543': [
    'ramen noodle soup',
    'pho vietnamese bowl',
    'noodle soup steaming',
  ],
  'dd99f21b-74ab-4abc-b1ed-c7099be4655d': [
    'indian curry biryani',
    'indian restaurant interior',
    'tandoori naan bread',
  ],
  'df8e549d-54c4-48ef-8e0b-c5a6646fcb7d': [
    'fitness gym interior',
    'wellness spa',
    'sports training',
  ],
  'e2c82e56-ae9c-40fc-ab7a-d002f446133f': [
    'fresh salad bowl',
    'garden salad colorful',
    'salad bar display',
  ],
  'ed7d9c57-0ab2-419d-8735-b3cf82f82ddd': [
    'electronics store display',
    'gadget store interior',
    'technology shop modern',
  ],
  'edc62206-513d-4d34-bf15-8ecbf21b2ff8': [
    'hearty soup bowl',
    'soup kitchen warm',
    'ramen broth closeup',
  ],
  'eea06ee4-2718-4bfa-b1c0-09036d1fd891': [
    'middle eastern sweets',
    'baklava dessert tray',
    'turkish delight display',
  ],
  'f502a5fa-3ea0-4a6b-9e1b-884b10811092': [
    'german restaurant interior',
    'schnitzel food',
    'german beer garden food',
  ],
  'f901958d-f285-4c70-9bcf-217fd42243e6': [
    'healthy food bowl',
    'buddha bowl colorful',
    'poke bowl fresh',
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