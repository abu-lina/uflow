import { notFound } from 'next/navigation';
import { renderProvidersPage } from '@/app/(public)/providers/renderProvidersPage';
import { findCityBySlug } from '@/lib/city-slug';

type RouteSearchParams = { [key: string]: string | string[] | undefined };

export default async function FoodCityPage({
  params,
  searchParams,
}: {
  params: Promise<{ city: string }>;
  searchParams: Promise<RouteSearchParams>;
}) {
  const { city: citySlug } = await params;
  const cityName = await findCityBySlug(citySlug);

  if (!cityName) {
    notFound();
  }

  return renderProvidersPage({
    searchParams,
    routeSection: 'food',
    routeCity: cityName,
  });
}
