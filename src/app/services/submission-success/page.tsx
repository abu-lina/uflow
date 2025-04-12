'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// Create a component that uses useSearchParams inside Suspense
function SubmissionContent() {
  const searchParams = useSearchParams();
  const serviceId = searchParams.get('id');
  const [countdown, setCountdown] = useState(5);
  
  // Countdown effect for auto-redirect
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Auto-redirect after countdown
  useEffect(() => {
    if (countdown === 0) {
      window.location.href = '/';
    }
  }, [countdown]);
  
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="mb-6 flex justify-center">
        <svg className="h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      
      <h1 className="text-3xl font-bold mb-4">Service Submitted Successfully!</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
        <p className="text-gray-600 mb-4">
          Thank you for submitting your service. Our team will review your submission within 1-2 business days.
        </p>
        
        {serviceId && (
          <div className="bg-gray-50 p-4 rounded-md mb-4">
            <p className="text-sm text-gray-500 mb-1">Service Reference ID:</p>
            <p className="font-mono font-medium">{serviceId}</p>
          </div>
        )}
        
        <p className="text-sm text-gray-500 mt-4">
          You will receive an email notification when your service is approved.
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link 
          href="/services"
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          View All Services
        </Link>
        
        <Link 
          href="/"
          className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
        >
          Return to Home {countdown > 0 && `(${countdown})`}
        </Link>
      </div>
    </div>
  );
}

// Main page component with Suspense
export default function SubmissionSuccessPage() {
  return (
    <Suspense fallback={
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="animate-pulse">
          <div className="h-16 w-16 mx-auto bg-gray-200 rounded-full mb-6"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
          <div className="h-48 bg-gray-100 rounded-lg border border-gray-200 mb-8"></div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="h-10 w-32 bg-gray-200 rounded-md"></div>
            <div className="h-10 w-32 bg-gray-200 rounded-md"></div>
          </div>
        </div>
      </div>
    }>
      <SubmissionContent />
    </Suspense>
  );
} 