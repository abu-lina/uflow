import { notFound } from 'next/navigation';
import { renderProvidersPage } from '@/app/(public)/providers/renderProvidersPage';
import { findCityBySlug } from '@/lib/city-slug';
import { getCategoryBySlug } from '@/services/categories';

type RouteSearchParams = { [key: string]: string | string[] | undefined };

export default async function FoodCityCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ city: string; category: string }>;
  searchParams: Promise<RouteSearchParams>;
}) {
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
