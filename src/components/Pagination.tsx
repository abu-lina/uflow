'use client';

import { useRouter, usePathname } from 'next/navigation';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
}

export default function Pagination({ 
  currentPage, 
  totalPages,
  onPageChange
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Define page range to display (show max 5 pages)
  const getPageRange = () => {
    const range: number[] = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're at the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      range.push(i);
    }
    
    return range;
  };

  const handlePageChange = (page: number) => {
    if (page === currentPage) return;
    
    // If client provided an onPageChange callback, use it
    if (onPageChange) {
      onPageChange(page);
      return;
    }
    
    // Otherwise update URL params
    const params = new URLSearchParams(window.location.search);
    params.set('page', page.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  // Don't render pagination if there's only one page
  if (totalPages <= 1) return null;

  const pageRange = getPageRange();

  return (
    <nav 
      className="flex justify-center mt-8" 
      aria-label="Pagination"
    >
      <ul className="flex items-center gap-1">
        {/* Previous button */}
        <li>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className={`px-3 py-1 rounded ${
              currentPage <= 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            aria-label="Go to previous page"
          >
            &laquo;
          </button>
        </li>
        
        {/* First page if not in range */}
        {pageRange[0] > 1 && (
          <>
            <li>
              <button
                onClick={() => handlePageChange(1)}
                className="px-3 py-1 rounded hover:bg-gray-100"
                aria-label="Go to page 1"
              >
                1
              </button>
            </li>
            {pageRange[0] > 2 && (
              <li className="px-2">...</li>
            )}
          </>
        )}
        
        {/* Page numbers */}
        {pageRange.map(page => (
          <li key={page}>
            <button
              onClick={() => handlePageChange(page)}
              className={`px-3 py-1 rounded ${
                page === currentPage
                  ? 'bg-primary text-white font-medium'
                  : 'hover:bg-gray-100'
              }`}
              aria-label={`Go to page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          </li>
        ))}
        
        {/* Last page if not in range */}
        {pageRange[pageRange.length - 1] < totalPages && (
          <>
            {pageRange[pageRange.length - 1] < totalPages - 1 && (
              <li className="px-2">...</li>
            )}
            <li>
              <button
                onClick={() => handlePageChange(totalPages)}
                className="px-3 py-1 rounded hover:bg-gray-100"
                aria-label="Go to last page"
              >
                {totalPages}
              </button>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
} 