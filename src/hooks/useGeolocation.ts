'use client';

import { useCallback, useState } from 'react';

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

/**
 * useGeolocation — thin, testable wrapper around the browser Geolocation API
 * for the "near me" search flow (Plan 196, M3).
 *
 * Does NOT request location automatically — callers must invoke
 * `requestLocation()` (e.g. on user tapping "In meiner Nähe").
 *
 * States:
 * - idle: no request made yet
 * - prompting: request in flight (browser permission dialog may be visible)
 * - granted: coords available
 * - denied: user denied permission (PERMISSION_DENIED)
 * - unavailable: browser lacks geolocation support, or POSITION_UNAVAILABLE
 * - timeout: request exceeded the timeout window
 */
export function useGeolocation(): UseGeolocationResult {
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [coords, setCoords] = useState<GeolocationCoords | null>(null);

  const requestLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      return;
    }

    setStatus('prompting');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setStatus('granted');
      },
      (error) => {
        if (error.code === PERMISSION_DENIED) {
          setStatus('denied');
        } else if (error.code === TIMEOUT) {
          setStatus('timeout');
        } else {
          setStatus('unavailable');
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setCoords(null);
  }, []);

  return { status, coords, requestLocation, reset };
}
