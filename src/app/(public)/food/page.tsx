import { renderProvidersPage } from '@/app/(public)/providers/renderProvidersPage';

type RouteSearchParams = { [key: string]: string | string[] | undefined };

export default async function FoodPage({
  searchParams,
}: {
  searchParams: Promise<RouteSearchParams>;
}) {
  return renderProvidersPage({ searchParams, routeSection: 'food' });
}
