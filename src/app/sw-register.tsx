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
                // New content is available, notify the user
                console.log('New version available!');
                toast.success(
                  'Eine neue Version ist verfügbar. Schließe alle Tabs, um zu aktualisieren.',
                  { 
                    id: 'sw-update',
                    duration: 5000,
                    position: 'bottom-center',
                    style: {
                      background: '#333',
                      color: '#fff',
                    },
                  }
                );
              } else {
                // Content is cached for offline use
                console.log('Content cached for offline use');
                toast.success(
                  'Die App ist jetzt offline verfügbar!',
                  { 
                    id: 'sw-cached',
                    duration: 3000,
                    position: 'bottom-center',
                  }
                );
              }
            }
          };
        };

        // Handle service worker errors
        registration.addEventListener('error', (event: Event) => {
          console.error('Service Worker error:', event);
          setStatus('failed');
          toast.error(
            'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.',
            { 
              id: 'sw-error',
              duration: 5000,
              position: 'bottom-center',
            }
          );
        });

        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              toast.success(
                'Eine neue Version ist verfügbar. Klicke hier, um zu aktualisieren.',
                { 
                  id: 'sw-update',
                  duration: 5000,
                  position: 'bottom-center',
                }
              );
              // Add click handler to reload the page
              const toastElement = document.querySelector(`[data-toast-id="sw-update"]`);
              if (toastElement) {
                toastElement.addEventListener('click', () => {
                  window.location.reload();
                });
              }
            }
          });
        });

      } catch (error) {
        console.error('Service Worker registration failed:', error);
        setStatus('failed');
        
        // Show error toast to the user
        toast.error(
          'Offline-Modus konnte nicht aktiviert werden. Die App funktioniert möglicherweise nicht offline.',
          { 
            id: 'sw-error',
            duration: 5000,
            position: 'bottom-center',
          }
        );
      }
    };
    
    // Register on load to ensure the page is fully loaded
    window.addEventListener('load', registerServiceWorker);
    
    // Clean up
    return () => {
      window.removeEventListener('load', registerServiceWorker);
    };
  }, []); // Remove status from dependencies to prevent unnecessary re-renders
  
  return null;
} 