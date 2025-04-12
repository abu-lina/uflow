'use client';

import { useEffect, useState, useCallback } from 'react';
import BusinessCard from '@/components/BusinessCard';
import { BusinessWithOwner, BusinessesApiResponse, BUSINESS_CATEGORIES } from '@/types/business';
import supabase from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function TestBusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [bookmarkedBusinessIds, setBookmarkedBusinessIds] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  const fetchBusinesses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '9',
        ...(searchQuery && { query: searchQuery }),
        ...(selectedCategory !== 'all' && { category: selectedCategory })
      });

      console.log('Fetching businesses with params:', params.toString());
      const response = await fetch(`/api/businesses?${params}`);
      const data: BusinessesApiResponse = await response.json();

      console.log('API Response:', data);

      if (data.error) {
        throw new Error(data.error);
      }

      if (!response.ok) {
        throw new Error('Failed to fetch businesses');
      }

      setBusinesses(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      console.error('Error fetching businesses:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setBusinesses([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  const fetchBookmarks = useCallback(async () => {
    if (!user) {
      setBookmarkedBusinessIds(new Set());
      return;
    }
    
    try {
      const { data: bookmarkData, error: bookmarkError } = await supabase
        .from('bookmarks')
        .select('bookmarkable_id')
        .eq('user_id', user.id)
        .eq('bookmarkable_type', 'business');
      
      if (bookmarkError) {
        console.error('Error fetching bookmarks:', bookmarkError);
        return;
      }
      
      const bookmarkedIds = new Set<string>(
        bookmarkData.map(bookmark => bookmark.bookmarkable_id)
      );
      
      setBookmarkedBusinessIds(bookmarkedIds);
    } catch (err) {
      console.error('Error fetching bookmarks:', err);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (user) {
      fetchBusinesses();
      fetchBookmarks();
    }
  }, [user, fetchBusinesses, fetchBookmarks]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setPage(1); // Reset to first page when changing category
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Test Business Listing</h1>
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Search Input */}
        <div className="flex-grow">
          <input
            type="text"
            placeholder="Search businesses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* Category Filter */}
        <div className="min-w-[200px]">
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {BUSINESS_CATEGORIES.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      )}

      {/* Active Filters */}
      {(searchQuery || selectedCategory !== 'all') && (
        <div className="flex flex-wrap gap-2 mb-4">
          {searchQuery && (
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center">
              Search: {searchQuery}
              <button 
                onClick={() => setSearchQuery('')}
                className="ml-2 text-blue-500 hover:text-blue-700"
              >
                ×
              </button>
            </span>
          )}
          {selectedCategory !== 'all' && (
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center">
              Category: {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
              <button 
                onClick={() => setSelectedCategory('all')}
                className="ml-2 text-blue-500 hover:text-blue-700"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Business Grid */}
      {!loading && !error && businesses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {businesses.map((business) => (
            <BusinessCard 
              key={business.id} 
              business={business} 
              isBookmarked={bookmarkedBusinessIds.has(business.id)}
            />
          ))}
        </div>
      )}

      {/* No Results State */}
      {!loading && !error && businesses.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No businesses found. Try changing your search criteria or category filter.
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Debug Information */}
      {!loading && !error && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Debug Information</h2>
          <div className="mb-2">
            <strong>Current Filters:</strong> 
            <span className="ml-2">
              Search: {searchQuery ? `"${searchQuery}"` : 'none'} | 
              Category: {selectedCategory}
            </span>
          </div>
          
          <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <h3 className="font-medium text-yellow-800">Category Debug:</h3>
            <div>Query param: <code>{selectedCategory !== 'all' ? selectedCategory : 'none'}</code></div>
            <div>Available in data: {new Set(businesses.map(b => b.category)).size} unique categories</div>
            <div>Categories in results: {Array.from(new Set(businesses.map(b => b.category))).join(', ') || 'none'}</div>
          </div>
          
          <pre className="text-sm overflow-auto">
            {JSON.stringify(businesses, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 