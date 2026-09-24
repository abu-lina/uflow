import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { renderProvidersPage } from '@/app/(public)/providers/renderProvidersPage';
import { findCityBySlug } from '@/lib/city-slug';
import { getCategoryBySlug } from '@/services/categories';
import { generateFoodCategoryCanonicalUrl } from '@/utils/canonicalUrl';

type RouteSearchParams = { [key: string]: string | string[] | undefined };

interface FoodCityCategoryPageProps {
  params: Promise<{ city: string; category: string }>;
  searchParams: Promise<RouteSearchParams>;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ummahflow.com';

export async function generateMetadata({
  params,
}: Pick<FoodCityCategoryPageProps, 'params'>): Promise<Metadata> {
  const { city: citySlug, category: categorySlug } = await params;

  const [cityName, category] = await Promise.all([
    findCityBySlug(citySlug),
    getCategoryBySlug(categorySlug, 'food'),
  ]);

  // Unknown city or category: the page itself 404s, so no canonical.
  if (!cityName || !category) {
    return {
      title: { absolute: 'Page not found | Ummah Flow' },
      robots: { index: false, follow: false },
    };
  }

  const categoryName = category.name_en || category.name_de;
  const canonical = generateFoodCategoryCanonicalUrl(
    cityName,
    category.slug || categorySlug,
    siteUrl,
  );
  const title = `${categoryName} in ${cityName} | Halal Food | Ummah Flow`;
  const description = `Discover halal ${categoryName} in ${cityName}. Browse verified halal food providers on Ummah Flow.`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'Ummah Flow',
      type: 'website',
    },
  };
}

export default async function FoodCityCategoryPage({
  params,
  searchParams,
}: FoodCityCategoryPageProps) {
  const { city: citySlug, category: categorySlug } = await params;

  const [cityName, category] = await Promise.all([
    findCityBySlug(citySlug),
    getCategoryBySlug(categorySlug, 'food'),
  ]);

  if (!cityName || !category) {
    notFound();
  }

  return renderProvidersPage({
    searchParams,
    routeSection: 'food',
    routeCity: cityName,
    routeCategory: category.category_id,
  });
}
