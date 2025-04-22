"use client"

import { useEffect, useState } from "react"
import SoukCard from "@/components/ui/SoukCard";
import { useSearchParams } from "next/navigation";
import { searchSouk, getAllSoukItems, SearchResult } from "@/lib/search";
import { supabase } from "@/lib/supabase";

export default function SoukPage() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('search');
  const categoryQuery = searchParams.get('category');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('souks')
          .select(`
            *,
            categories (
              name_de
            ),
            profiles!souk_owner_id (
              full_name
            )
          `)

        if (categoryQuery && categoryQuery !== "Alle") {
          query = query.eq('category_id', categoryQuery)
        }

        if (searchQuery) {
          query = query.ilike('souk_name', `%${searchQuery}%`)
        }

        const { data, error } = await query

        if (error) {
          console.error('Error fetching data:', error);
          setResults([]);
        } else {
          console.log('Fetched data:', data); // Debug log
          setResults(data || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [searchQuery, categoryQuery]);

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-[#F5F5F5]">
      {/* Header */}
      <div className="flex flex-col items-center w-full max-w-[1280px] px-4 py-8 gap-8">
        {/* Souk */}
        <div className="flex flex-row flex-wrap items-center content-start p-0 gap-8 w-[1280px] flex-none order-1 self-stretch flex-grow-0">
          {isLoading ? (
            <div className="w-full text-center text-[#7A7A7A]">Loading...</div>
          ) : results.length > 0 ? (
            results.map((souk) => (
              <SoukCard
                key={souk.souk_id}
                souk={souk}
              />
            ))
          ) : (
            <div className="w-full text-center text-[#7A7A7A]">
              No items found
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 