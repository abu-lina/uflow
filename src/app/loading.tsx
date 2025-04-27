'use client';

import { Skeleton } from '@/components/ui';
import { LoadingSpinner } from '@/components/ui/loading/loading-spinner';

export default function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

export function HomeLoading() {
  return (
    <div className="min-h-screen bg-background">
      <main className="relative pt-20">
        {/* Hero Section Skeleton */}
        <section className="flex min-h-[calc(100vh-5rem)] items-center py-16 md:py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="flex flex-col items-center gap-12 md:flex-row md:gap-16">
              <div className="w-full space-y-8 md:w-1/2">
                <Skeleton.Rect className="mx-auto h-12 w-48 md:mx-0" />
                <div className="space-y-4">
                  <Skeleton.Text className="h-12 w-3/4" />
                  <Skeleton.Text className="h-12 w-1/2" />
                </div>
                <Skeleton.Text className="h-8 w-1/2" />
                <Skeleton.Text className="h-12 w-48" />
              </div>
              <div className="w-full md:w-1/2">
                <Skeleton.Card className="mx-auto aspect-square w-full max-w-2xl md:aspect-[4/3]" />
              </div>
            </div>
          </div>
        </section>

        {/* Zakat Projects Section Skeleton */}
        <section className="bg-muted py-16 md:py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="space-y-12">
              <Skeleton.Text className="mx-auto h-10 w-64 md:mx-0" />
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton.Card key={i} className="aspect-[4/3] w-full" />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* About Section Skeleton */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="flex flex-col items-center gap-12 md:flex-row md:gap-16">
              <div className="w-full space-y-8 md:w-1/2">
                <div className="space-y-4">
                  <Skeleton.Text className="h-4 w-24" />
                  <Skeleton.Text className="h-10 w-64" />
                </div>
                <div className="space-y-4">
                  <Skeleton.Text className="h-8 w-full" />
                  <Skeleton.Text className="h-8 w-full" />
                  <Skeleton.Text className="h-8 w-3/4" />
                </div>
              </div>
              <div className="flex w-full justify-center md:w-1/2">
                <Skeleton.Circle className="h-64 w-64" />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
