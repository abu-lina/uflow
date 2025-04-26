'use client';

import { Skeleton } from "@/components/ui";
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

export function HomeLoading() {
  return (
    <div className="min-h-screen bg-background">
      <main className="relative pt-20">
        {/* Hero Section Skeleton */}
        <section className="min-h-[calc(100vh-5rem)] flex items-center py-16 md:py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
              <div className="w-full md:w-1/2 space-y-8">
                <Skeleton.Rect className="w-48 h-12 mx-auto md:mx-0" />
                <div className="space-y-4">
                  <Skeleton.Text className="w-3/4 h-12" />
                  <Skeleton.Text className="w-1/2 h-12" />
                </div>
                <Skeleton.Text className="w-1/2 h-8" />
                <Skeleton.Text className="w-48 h-12" />
              </div>
              <div className="w-full md:w-1/2">
                <Skeleton.Card className="w-full aspect-square md:aspect-[4/3] max-w-2xl mx-auto" />
              </div>
            </div>
          </div>
        </section>

        {/* Zakat Projects Section Skeleton */}
        <section className="py-16 md:py-24 bg-muted">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="space-y-12">
              <Skeleton.Text className="w-64 h-10 mx-auto md:mx-0" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                {[...Array(4)].map((_, i) => (
                  <Skeleton.Card key={i} className="w-full aspect-[4/3]" />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* About Section Skeleton */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 lg:px-8">
            <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
              <div className="w-full md:w-1/2 space-y-8">
                <div className="space-y-4">
                  <Skeleton.Text className="w-24 h-4" />
                  <Skeleton.Text className="w-64 h-10" />
                </div>
                <div className="space-y-4">
                  <Skeleton.Text className="w-full h-8" />
                  <Skeleton.Text className="w-full h-8" />
                  <Skeleton.Text className="w-3/4 h-8" />
                </div>
              </div>
              <div className="w-full md:w-1/2 flex justify-center">
                <Skeleton.Circle className="w-64 h-64" />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}