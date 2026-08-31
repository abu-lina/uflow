import { redirect } from 'next/navigation';
import ProvidersPage from '@/app/(public)/providers/page';
import { SECTION_META } from '@/config/sectionFilters';

type RouteSearchParams = { [key: string]: string | string[] | undefined };

export default async function UmmahPage({
  searchParams,
}: {
  searchParams: Promise<RouteSearchParams>;
}) {
  if (!SECTION_META.ummah.active) {
    redirect('/food');
  }
  const params = await searchParams;
  return ProvidersPage({ searchParams: Promise.resolve({ ...params, section: 'ummah' }) });
}
