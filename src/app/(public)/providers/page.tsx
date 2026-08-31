import { renderProvidersPage } from './renderProvidersPage';

/**
 * Default page export for /providers route (rarely accessed directly).
 * Delegates to renderProvidersPage.
 */
export default async function ProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return renderProvidersPage({ searchParams });
}
