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
                // New content is available, notify the user
                console.log('New version available!');
                toast.success(
                  'A new version is available. Close all tabs to upgrade.',
                  { id: 'sw-update', duration: 5000 }
                );
              } else {
                // Content is cached for offline use
                console.log('Content cached for offline use');
              }
            }
          };
        };
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        setStatus('failed');
        
        // Show error toast to the user
        toast.error('Could not enable offline mode. This app may not work offline.', {
          id: 'sw-error',
          duration: 5000,
        });
      }
    };
    
    // Register on load to ensure the page is fully loaded
    window.addEventListener('load', registerServiceWorker);
    
    // Log status changes for debugging
    console.log(`Service worker status: ${status}`);
    
    // Clean up
    return () => {
      window.removeEventListener('load', registerServiceWorker);
    };
  }, [status]); // Add status to dependencies to log changes
  
  return null;
} 