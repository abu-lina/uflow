'use client';

import { useEffect, useState } from 'react';

import { Header } from '@/components/layout/Header';
import { ExploreCard } from '@/components/shared/ExploreCard';
import { useSearch } from '@/providers/search-provider';
import { getSouks, type Souk } from '@/services/souks';

export default function SouksPage() {
  const [souks, setSouks] = useState<Souk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedCategory, searchQuery } = useSearch();

  useEffect(() => {
    async function fetchSouks() {
      try {
        const data = await getSouks();
        setSouks(data);
      } catch (err) {
        setError('Failed to load souks');
        console.error('Error loading souks:', err);
      } finally {
        setLoading(false);
      }
    }

    void fetchSouks();
  }, []);

  // Filter souks based on selected category and search query
  const filteredSouks = souks.filter((souk) => {
    const matchesCategory = selectedCategory ? souk.category_id === selectedCategory : true;
    const matchesQuery = searchQuery
      ? souk.souk_name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCategory && matchesQuery;
  });

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
            {filteredSouks.map((souk) => (
              <ExploreCard key={souk.souk_id} {...souk} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
