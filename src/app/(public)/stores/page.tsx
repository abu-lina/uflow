import ProvidersPage from '@/app/(public)/providers/page';

type RouteSearchParams = { [key: string]: string | string[] | undefined };

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<RouteSearchParams>;
}) {
  const params = await searchParams;
  return ProvidersPage({ searchParams: Promise.resolve({ ...params, section: 'business' }) });
}
