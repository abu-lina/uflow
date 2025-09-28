'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error;
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Optionally log error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#f5f5f5] to-[#fbfbfb]">
      <div className="rounded-lg bg-white p-8 shadow-lg">
        <h2 className="mb-4 text-2xl font-bold text-red-600">Something went wrong!</h2>
        <p className="mb-4 text-gray-700">{error.message}</p>
        <button
          className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          onClick={() => reset()}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
