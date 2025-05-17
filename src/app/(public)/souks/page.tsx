'use client';
console.log('Rendering /souks page');

import { useEffect, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { Header } from '@/components/layout/Header';
import { ExploreCard } from '@/components/shared/ExploreCard';
import { searchSouks, type Souk } from '@/services/souks';

export default function SouksPage() {
  const [souks, setSouks] = useState<Souk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [paramVersion, setParamVersion] = useState(0);
  const location = searchParams.get('location') || 'Überall';
  const category = searchParams.get('category') || 'Alle';
  const query = searchParams.get('q') || '';

  useEffect(() => {
    setParamVersion((v) => v + 1);
  }, [searchParams]);

  useEffect(() => {
    async function fetchSouks() {
      try {
        const data = await searchSouks(query, category, location);
        setSouks(data);
      } catch (err) {
        setError('Failed to load souks');
        console.error('Error loading souks:', err);
      } finally {
        setLoading(false);
      }
    }

    void fetchSouks();
  }, [query, category, location, paramVersion]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-8">
            <div className="text-uFlowText font-inter-tight text-xl">Loading...</div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-8">
            <div className="text-uFlowText font-inter-tight text-xl text-red-500">{error}</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Souks Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {souks.map((souk) => (
              <ExploreCard key={souk.souk_id} {...souk} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
