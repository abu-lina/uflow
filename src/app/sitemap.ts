import type { MetadataRoute } from 'next';

import { supabase } from '@/lib/supabase/client';
import {
  generateFoodCityCanonicalUrl,
  generateFoodCategoryCanonicalUrl,
} from '@/utils/canonicalUrl';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ummahflow.com';

  const entries: MetadataRoute.Sitemap = [{ url: `${siteUrl}/food` }];

  const { data: providers } = await supabase
    .from('providers')
    .select('address_city, category_id')
    .eq('review_status', 'approved')
    .eq('listing_type', 'food');

  if (!providers || providers.length === 0) return entries;

  type ProviderRow = { address_city: string | null; category_id: string | null };
  const rows = providers as ProviderRow[];

  const citySet = new Set<string>();
  const pairSet = new Set<string>();
  const categoryIds = new Set<string>();

  for (const row of rows) {
    const city = row.address_city;
    if (!city || city.trim() === '' || city === 'null') continue;
    citySet.add(city);
    if (row.category_id && row.category_id !== 'null') {
      categoryIds.add(row.category_id);
      pairSet.add(`${city}||${row.category_id}`);
    }
  }

  for (const city of Array.from(citySet).sort((a, b) => a.localeCompare(b, 'de'))) {
    entries.push({ url: generateFoodCityCanonicalUrl(city, siteUrl) });
  }

  if (categoryIds.size > 0) {
    const { data: categories } = await supabase
      .from('categories')
      .select('category_id, slug')
      .in('category_id', Array.from(categoryIds));

    const slugById = new Map<string, string>();
    if (categories) {
      for (const cat of categories as { category_id: string; slug: string | null }[]) {
        if (cat.slug) slugById.set(cat.category_id, cat.slug);
      }
    }

    const sortedPairs = Array.from(pairSet).sort();
    for (const pair of sortedPairs) {
      const [city, catId] = pair.split('||');
      const slug = slugById.get(catId);
      if (slug) {
        entries.push({ url: generateFoodCategoryCanonicalUrl(city, slug, siteUrl) });
      }
    }
  }

  return entries;
}
