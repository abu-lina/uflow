'use client';

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

/**
 * Service Worker registration statuses
 */
type ServiceWorkerStatus = 'loading' | 'registered' | 'failed' | 'unsupported' | 'disabled';

/**
 * Component that registers the service worker for PWA functionality
 * No visible UI, only handles the registration process
 */
export default function ServiceWorkerRegister() {
  const [status, setStatus] = useState<ServiceWorkerStatus>('loading');
  
  useEffect(() => {
    // Only register in browser environment
    if (typeof window === 'undefined') return;
    
    // Skip registration in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('Service Worker registration skipped in development mode');
      setStatus('disabled');
      return;
    }
    
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.warn('Service workers are not supported in this browser');
      setStatus('unsupported');
      return;
    }
    
    const registerServiceWorker = async () => {
      try {
        // Register the service worker when the page is fully loaded
        const registration = await navigator.serviceWorker.register('/sw.js', { 
          scope: '/',
          type: 'module', // Enable ES modules in service worker
        });
        
        console.log('Service Worker registered successfully:', registration.scope);
        setStatus('registered');
        
        // Set up update handling
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New content is available, show update toast
                toast.custom((t) => (
                  <div
                    onClick={() => {
                      window.location.reload();
                      toast.dismiss(t.id);
                    }}
                    className="cursor-pointer rounded-lg bg-white px-6 py-4 shadow-lg"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      New version available! Click to update.
                    </p>
                  </div>
                ), {
                  duration: 6000,
                  position: 'bottom-center',
                });
              } else {
                // Content is cached for offline use
                console.log('Content is cached for offline use.');
                toast.success('App is now available offline!', {
                  duration: 3000,
                  position: 'bottom-center',
                });
              }
            }
          };
        };
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        setStatus('failed');
        toast.error('Failed to register service worker. Some features may not work offline.');
      }
    };

    // Register service worker when the page is fully loaded
    if (document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      window.addEventListener('load', registerServiceWorker);
    }

    // Cleanup
    return () => {
      window.removeEventListener('load', registerServiceWorker);
    };
  }, []);

  // Log status changes for debugging
  useEffect(() => {
    console.log('Service Worker status:', status);
  }, [status]);

  return null;
} 