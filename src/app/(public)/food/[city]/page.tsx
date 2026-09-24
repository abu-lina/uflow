import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { renderProvidersPage } from '@/app/(public)/providers/renderProvidersPage';
import { findCityBySlug } from '@/lib/city-slug';
import { generateFoodCityCanonicalUrl } from '@/utils/canonicalUrl';

type RouteSearchParams = { [key: string]: string | string[] | undefined };

interface FoodCityPageProps {
  params: Promise<{ city: string }>;
  searchParams: Promise<RouteSearchParams>;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ummahflow.com';

export async function generateMetadata({
  params,
}: Pick<FoodCityPageProps, 'params'>): Promise<Metadata> {
  const { city: citySlug } = await params;
  const cityName = await findCityBySlug(citySlug);

  // Unknown slug: the page itself 404s, so don't advertise a canonical for it.
  if (!cityName) {
    return {
      title: { absolute: 'City not found | Ummah Flow' },
      robots: { index: false, follow: false },
    };
  }

  const canonical = generateFoodCityCanonicalUrl(cityName, siteUrl);
  const title = `Halal Food in ${cityName} | Ummah Flow`;
  const description = `Find halal restaurants, takeaways and food providers in ${cityName}. Ummah Flow connects Muslims with trusted local halal businesses.`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description: `Find halal restaurants, takeaways and food providers in ${cityName}.`,
      url: canonical,
      siteName: 'Ummah Flow',
      type: 'website',
    },
  };
}

export default async function FoodCityPage({ params, searchParams }: FoodCityPageProps) {
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
