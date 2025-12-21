'use client';

import { useState, useEffect } from 'react';
import { useWaitlistFlow } from '@/hooks/useWaitlistFlow';
import { Button } from '@/components/ui/Button';

/**
 * Debug component for waitlist flow (dev only)
 * Shows current state, allows manual state transitions, and can reset the flow
 */
export function WaitlistFlowDebug() {
  const {
    currentState,
    flowData,
    isInitialized,
    isLoading,
    handleContinue,
    handleAboutComplete,
    handleWaitlistSuccess,
    handleSuccessComplete,
    handleLearnMore,
    handleAboutCompleteFromEarlyAccess,
    handleEarlyAccessComplete,
  } = useWaitlistFlow();

  const [isVisible, setIsVisible] = useState(false);
  const [localStorageData, setLocalStorageData] = useState<Record<string, string>>({});
  const [sessionStorageData, setSessionStorageData] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load storage data
    const loadStorageData = () => {
      const local: Record<string, string> = {};
      const session: Record<string, string> = {};

      // Check localStorage
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            local[key] = localStorage.getItem(key) || '';
          }
        }
      } catch (e) {
        console.error('Error reading localStorage:', e);
      }

      // Check sessionStorage
      try {
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) {
            session[key] = sessionStorage.getItem(key) || '';
          }
        }
      } catch (e) {
        console.error('Error reading sessionStorage:', e);
      }

      setLocalStorageData(local);
      setSessionStorageData(session);
    };

    loadStorageData();
    const interval = setInterval(loadStorageData, 1000);
    return () => clearInterval(interval);
  }, []);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleResetFlow = () => {
    // Clear all storage
    try {
      localStorage.removeItem('hasSeenSplashScreen');
      sessionStorage.removeItem('showEarlyAccess');
      sessionStorage.removeItem('waitlistEmail');
      sessionStorage.removeItem('waitlistToken');
      sessionStorage.removeItem('selectedCity');
      sessionStorage.removeItem('interestCount');
      
      // Reload page to reset state
      window.location.reload();
    } catch (e) {
      console.error('Error resetting flow:', e);
    }
  };

  const handleClearStorage = (type: 'local' | 'session') => {
    try {
      if (type === 'local') {
        localStorage.clear();
      } else {
        sessionStorage.clear();
      }
      window.location.reload();
    } catch (e) {
      console.error(`Error clearing ${type}Storage:`, e);
    }
  };

  if (!isVisible) {
    return (
      <button
        className="fixed bottom-4 left-4 z-[9999] rounded-full bg-red-500 p-2 text-white shadow-lg"
        type="button"
        onClick={() => setIsVisible(true)}
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-[9999] max-h-[80vh] w-96 overflow-y-auto rounded-lg bg-white p-4 shadow-2xl border border-gray-200">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Waitlist Flow Debug</h3>
        <button
          className="text-gray-500 hover:text-gray-700"
          type="button"
          onClick={() => setIsVisible(false)}
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        {/* Current State */}
        <div>
          <h4 className="font-semibold text-sm mb-2">Current State</h4>
          <div className="rounded bg-gray-100 p-2">
            <div className="text-sm">
              <div><strong>State:</strong> {currentState}</div>
              <div><strong>Initialized:</strong> {isInitialized ? 'Yes' : 'No'}</div>
              <div><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </div>

        {/* Flow Data */}
        <div>
          <h4 className="font-semibold text-sm mb-2">Flow Data</h4>
          <div className="rounded bg-gray-100 p-2">
            <div className="text-sm">
              <div><strong>Email:</strong> {flowData.email || 'None'}</div>
              <div><strong>Token:</strong> {flowData.waitlistToken ? `${flowData.waitlistToken.substring(0, 20)}...` : 'None'}</div>
            </div>
          </div>
        </div>

        {/* Manual State Transitions */}
        <div>
          <h4 className="font-semibold text-sm mb-2">Manual Transitions</h4>
          <div className="flex flex-col gap-2">
            {currentState === 'splash' && (
              <Button size="sm" variant="secondary" onClick={handleContinue}>
                Continue (Splash → About)
              </Button>
            )}
            {currentState === 'about' && (
              <Button size="sm" variant="secondary" onClick={handleAboutComplete}>
                Complete About (About → Waitlist)
              </Button>
            )}
            {currentState === 'waitlist' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleWaitlistSuccess('test@example.com', 'test-token')}
              >
                Simulate Success (Waitlist → Success)
              </Button>
            )}
            {currentState === 'success' && (
              <Button size="sm" variant="secondary" onClick={handleSuccessComplete}>
                Continue (Success → Early Access)
              </Button>
            )}
            {currentState === 'earlyAccess' && (
              <>
                <Button size="sm" variant="secondary" onClick={handleLearnMore}>
                  Learn More (Early Access → About)
                </Button>
                <Button size="sm" variant="secondary" onClick={handleEarlyAccessComplete}>
                  Complete (Early Access → Waitlist)
                </Button>
              </>
            )}
            {currentState === 'aboutFromEarlyAccess' && (
              <Button size="sm" variant="secondary" onClick={handleAboutCompleteFromEarlyAccess}>
                Back (About → Early Access)
              </Button>
            )}
          </div>
        </div>

        {/* Storage Data */}
        <div>
          <h4 className="font-semibold text-sm mb-2">localStorage</h4>
          <div className="rounded bg-gray-100 p-2 max-h-32 overflow-y-auto">
            <pre className="text-xs">
              {Object.keys(localStorageData).length > 0
                ? JSON.stringify(localStorageData, null, 2)
                : 'Empty'}
            </pre>
          </div>
          <Button
            className="mt-2"
            size="sm"
            variant="danger"
            onClick={() => handleClearStorage('local')}
          >
            Clear localStorage
          </Button>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-2">sessionStorage</h4>
          <div className="rounded bg-gray-100 p-2 max-h-32 overflow-y-auto">
            <pre className="text-xs">
              {Object.keys(sessionStorageData).length > 0
                ? JSON.stringify(sessionStorageData, null, 2)
                : 'Empty'}
            </pre>
          </div>
          <Button
            className="mt-2"
            size="sm"
            variant="danger"
            onClick={() => handleClearStorage('session')}
          >
            Clear sessionStorage
          </Button>
        </div>

        {/* Reset Flow */}
        <div>
          <Button
            fullWidth
            size="sm"
            variant="danger"
            onClick={handleResetFlow}
          >
            Reset Flow & Reload
          </Button>
        </div>
      </div>
    </div>
  );
}
