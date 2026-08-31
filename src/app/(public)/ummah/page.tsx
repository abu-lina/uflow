import { redirect } from 'next/navigation';
import { renderProvidersPage } from '@/app/(public)/providers/renderProvidersPage';
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
  return renderProvidersPage({ searchParams, routeSection: 'ummah' });
}
