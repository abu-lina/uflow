'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { logApp } from '@/lib/logger';

export type GeolocationStatus =
  | 'idle'
  | 'prompting'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'timeout';

export interface GeolocationCoords {
  latitude: number;
  longitude: number;
}

export interface UseGeolocationResult {
  status: GeolocationStatus;
  coords: GeolocationCoords | null;
  requestLocation: () => void;
  reset: () => void;
}

// Standard GeolocationPositionError codes (not relying on the constants
// present on the error instance, since test doubles may omit them).
const PERMISSION_DENIED = 1;
const TIMEOUT = 3;

// iOS standalone PWA can suppress both the permission prompt and the
// getCurrentPosition error callback. This client-side watchdog is the only
// guaranteed terminal path for that scenario (Plan 215).
const WATCHDOG_MS = 12000;

/**
 * Detect iOS standalone PWA / display-mode: standalone.
 *
 * Guarded so it can be called from jsdom or SSR contexts where `navigator`
 * or `window.matchMedia` may be absent.
 */
export function isStandaloneDisplayMode(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  if (typeof navigator !== 'undefined' && nav.standalone === true) {
    return true;
  }

  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function'
  ) {
    return window.matchMedia('(display-mode: standalone)').matches === true;
  }

  return false;
}

function currentTimeMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function logOutcome(
  status: GeolocationStatus,
  errorCode: number | undefined,
  startTime: number,
  forcedByWatchdog = false,
): void {
  const elapsedMs = Math.round(currentTimeMs() - startTime);

  logApp('info', {
    event: 'geolocation_outcome',
    status,
    ...(errorCode !== undefined ? { errorCode } : {}),
    standalone: isStandaloneDisplayMode(),
    elapsedMs,
    ...(forcedByWatchdog ? { forcedByWatchdog: true } : {}),
  });
}

/**
 * useGeolocation — thin, testable wrapper around the browser Geolocation API
 * for the "near me" search flow (Plan 196, M3; Plan 215 watchdog).
 *
 * Does NOT request location automatically — callers must invoke
 * `requestLocation()` (e.g. on user tapping "In meiner Nähe").
 *
 * States:
 * - idle: no request made yet
 * - prompting: request in flight (browser permission dialog may be visible)
 * - granted: coords available
 * - denied: user denied permission (PERMISSION_DENIED) or iOS standalone PWA
 *           hang (watchdog forced)
 * - unavailable: browser lacks geolocation support, or POSITION_UNAVAILABLE
 * - timeout: request exceeded the timeout window
 */
export function useGeolocation(): UseGeolocationResult {
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [coords, setCoords] = useState<GeolocationCoords | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current !== null) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  // Tear down the watchdog on unmount to avoid a setState-after-unmount warning
  // if the component disappears while a request is in flight.
  useEffect(() => {
    return () => {
      clearWatchdog();
    };
  }, [clearWatchdog]);

  const requestLocation = useCallback(() => {
    clearWatchdog();

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      return;
    }

    setStatus('prompting');
    const startTime = currentTimeMs();

    const handleSuccess = (position: GeolocationPosition) => {
      clearWatchdog();
      setCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setStatus('granted');
      logOutcome('granted', undefined, startTime);
    };

    const handleError = (error: GeolocationPositionError) => {
      clearWatchdog();
      let nextStatus: GeolocationStatus;
      if (error.code === PERMISSION_DENIED) {
        nextStatus = 'denied';
      } else if (error.code === TIMEOUT) {
        nextStatus = 'timeout';
      } else {
        nextStatus = 'unavailable';
      }
      setStatus(nextStatus);
      logOutcome(nextStatus, error.code, startTime);
    };

    watchdogRef.current = setTimeout(() => {
      watchdogRef.current = null;
      const terminalStatus = isStandaloneDisplayMode() ? 'denied' : 'timeout';
      setStatus(terminalStatus);
      logOutcome(terminalStatus, undefined, startTime, true);
    }, WATCHDOG_MS);

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  }, [clearWatchdog]);

  const reset = useCallback(() => {
    clearWatchdog();
    setStatus('idle');
    setCoords(null);
  }, [clearWatchdog]);

  return { status, coords, requestLocation, reset };
}
