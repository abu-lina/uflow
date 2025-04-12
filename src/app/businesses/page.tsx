'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import BusinessCard from '@/components/BusinessCard';
import { BusinessWithOwner } from '@/types/business';

const BusinessesPage = () => {
  // State for businesses data and UI state
  const [businesses, setBusinesses] = useState<BusinessWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 9,
    totalItems: 0,
    totalPages: 0
  });

  // Get search parameters
  const searchParams = useSearchParams();
  const page = Number(searchParams.get('page') || '1');
  const query = searchParams.get('query');

  // Fetch businesses data
  useEffect(() => {
    const fetchBusinesses = async () => {
      setLoading(true);
      setError('');
      
      try {
        // Build URL with search parameters
        const params = new URLSearchParams();
        params.set('page', page.toString());
        if (query) params.set('query', query);
        
        console.log('Fetching businesses with params:', Object.fromEntries(params.entries()));
        
        const response = await fetch(`/api/businesses?${params.toString()}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Server responded with ${response.status}: ${response.statusText}`
          );
        }
        
        const data = await response.json();
        console.log('Businesses data received:', { 
          count: data.businesses?.length || 0,
          totalItems: data.pagination?.totalItems
        });
        
        setBusinesses(data.businesses || []);
        setPagination({
          page: data.pagination?.page || 1,
          pageSize: data.pagination?.pageSize || 9,
          totalItems: data.pagination?.totalItems || 0,
          totalPages: data.pagination?.totalPages || 0
        });
      } catch (err) {
        console.error('Error fetching businesses:', err);
        setError(err instanceof Error ? err.message : 'Failed to load businesses');
      } finally {
        setLoading(false);
      }
    };

    fetchBusinesses();
  }, [page, query]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Businesses</h1>
      
      {/* Search Bar */}
      <div className="mb-8">
        <form className="flex gap-2">
          <input
            type="text"
            placeholder="Search businesses..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            defaultValue={query || ''}
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Search
          </button>
        </form>
      </div>

      {/* Business Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {businesses.map((business) => (
          <BusinessCard key={business.id} business={business} />
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
            <a
              key={pageNum}
              href={`/businesses?page=${pageNum}${query ? `&query=${query}` : ''}`}
              className={`px-4 py-2 rounded-lg ${
                pageNum === pagination.page
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {pageNum}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default BusinessesPage; 