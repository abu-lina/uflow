'use client';

import { useEffect, useState } from 'react';

/**
 * Returns true when we should disable entrance/scroll animations to avoid
 * top-to-bottom ripple flicker on reload (e.g. iOS in local dev).
 * Scoped to development only so production behavior is unchanged.
 */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      setReduce(false);
      return;
    }
    const isIOS =
      typeof navigator !== 'undefined' &&
      /iPad|iPhone|iPod/.test(navigator.userAgent);
    setReduce(isIOS);
  }, []);

  return reduce;
}
