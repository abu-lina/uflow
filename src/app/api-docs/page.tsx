'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import SwaggerUI to reduce initial bundle size
// SwaggerUI is a large component (~200KB+) that's only needed on this page
const SwaggerUI = dynamic(
  () => import('swagger-ui-react').then((mod) => mod.default),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading API documentation...</p>
        </div>
      </div>
    ),
    ssr: false, // SwaggerUI is client-only
  }
);

export default function ApiDocsPage() {
  const [spec, setSpec] = useState(null);

  useEffect(() => {
    fetch('/api/swagger.json')
      .then((res) => res.json())
      .then((data) => setSpec(data))
      .catch((error) => console.error('Error loading Swagger spec:', error));
  }, []);

  if (!spec) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading API documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-4">API Documentation</h1>
        <SwaggerUI spec={spec} />
      </div>
    </div>
  );
}

