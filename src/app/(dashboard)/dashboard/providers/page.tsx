'use client';

import dynamic from 'next/dynamic';

const AdminProvidersPageContent = dynamic(
  () =>
    import('@/components/admin/AdminProvidersPageContent').then((mod) => ({
      default: mod.AdminProvidersPageContent,
    })),
  {
    loading: () => (
      <div className="container mx-auto p-4 md:p-6 max-w-6xl">
        <div className="mb-8">
          <div className="h-8 w-48 animate-pulse rounded bg-gray-200 mb-4" />
          <div className="h-10 w-64 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      </div>
    ),
    ssr: false,
  }
);

export default function AdminProvidersPage() {
  return <AdminProvidersPageContent />;
}
