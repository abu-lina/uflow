'use client';

import dynamic from 'next/dynamic';

const ImportDryRunPageContent = dynamic(
  () =>
    import('@/features/import/components/ImportDryRunPageContent').then((mod) => ({
      default: mod.ImportDryRunPageContent,
    })),
  {
    loading: () => (
      <div className="container mx-auto max-w-5xl p-4 md:p-6">
        <div className="mb-6">
          <div className="mb-2 h-8 w-72 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-96 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="mb-6 flex gap-4">
          <div className="h-10 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-10 w-40 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    ),
    ssr: false,
  },
);

export default function ImportPage() {
  return <ImportDryRunPageContent />;
}
