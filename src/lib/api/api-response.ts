import { NextResponse } from 'next/server';

type ApiResponseOptions = {
  status?: number;
  cache?: 'no-cache' | 'short' | 'medium' | 'long';
};

export function apiResponse<T>(
  data: T,
  options: ApiResponseOptions = {}
) {
  const { status = 200, cache = 'no-cache' } = options;
  
  const headers = new Headers();
  
  // Set appropriate cache headers
  switch (cache) {
    case 'no-cache':
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      break;
    case 'short':
      headers.set('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=300');
      break;
    case 'medium':
      headers.set('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=600');
      break;
    case 'long':
      headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
      break;
  }
  
  // Return formatted response
  return NextResponse.json({
    success: true,
    data
  }, { status, headers });
}

export function apiError(
  message: string,
  status: number = 400,
  details?: string,
  code?: string
) {
  const headers = new Headers();
  // Errors should not be cached
  headers.set('Cache-Control', 'no-store');
  
  const errorResponse = {
    success: false,
    error: {
      message,
      code,
      details: process.env.NODE_ENV === 'development' ? details : undefined
    }
  };
  
  return NextResponse.json(errorResponse, { status, headers });
}

// Helper function to handle specific error types
export function handleApiError(error: unknown): ReturnType<typeof apiError> {
  console.error('API Error:', error);
  
  // Handle Supabase PostgrestError
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    const pgError = error as { code: string; message: string; details?: string };
    
    // Map common database errors to appropriate status codes
    let status = 500;
    if (pgError.code === '23505') status = 409; // Unique violation
    if (pgError.code === '23503') status = 400; // Foreign key violation
    if (pgError.code === '42P01') status = 500; // Undefined table
    if (pgError.code === '42703') status = 500; // Undefined column
    if (pgError.code === '28000') status = 401; // Invalid authorization
    
    return apiError(
      'Database operation failed',
      status,
      pgError.message,
      pgError.code
    );
  }
  
  // Handle standard Error objects
  if (error instanceof Error) {
    return apiError(
      'An error occurred',
      500,
      error.message,
      error.name
    );
  }
  
  // Handle other unknown errors
  return apiError(
    'An unexpected error occurred',
    500,
    String(error)
  );
}

// Utility for pagination responses
export function paginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  },
  options: ApiResponseOptions = {}
) {
  return apiResponse({
    data,
    pagination
  }, options);
} 