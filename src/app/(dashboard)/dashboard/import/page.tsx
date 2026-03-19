'use client';

import dynamic from 'next/dynamic';

const ImportDryRunPageContent = dynamic(
  () =>
    import('@/features/import/components/ImportDryRunPageContent').then((mod) => ({
      default: mod.ImportDryRunPageContent,
    })),
  {
    loading: () => (
      <div className="container mx-auto p-4 md:p-6 max-w-5xl">
        <div className="mb-6">
          <div className="h-8 w-72 animate-pulse rounded bg-gray-200 mb-2" />
          <div className="h-4 w-96 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="flex gap-4 mb-6">
          <div className="h-10 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-10 w-40 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    ),
    ssr: false,
  }
);

export default function ImportPage() {
  return <ImportDryRunPageContent />;
}
