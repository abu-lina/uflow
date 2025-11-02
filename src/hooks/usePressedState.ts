import { useState } from 'react';

/**
 * Hook to manage pressed/active state for interactive elements
 * Handles both mouse and touch events for cross-platform support
 * 
 * @returns Object with isPressed state and event handlers
 */
export function usePressedState() {
  const [isPressed, setIsPressed] = useState(false);

  const handlers = {
    onMouseDown: () => setIsPressed(true),
    onMouseUp: () => setIsPressed(false),
    onMouseLeave: () => setIsPressed(false),
    onTouchStart: () => setIsPressed(true),
    onTouchEnd: () => setIsPressed(false),
  };

  return { isPressed, ...handlers };
}

