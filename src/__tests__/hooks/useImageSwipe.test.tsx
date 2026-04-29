import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { useImageSwipe } from '@/hooks/useImageSwipe';

function makeTouchEvent(
  clientX: number,
  clientY: number,
  preventDefault?: () => void
) {
  const mockPreventDefault = preventDefault || vi.fn();
  return {
    touches: [{ clientX, clientY }],
    preventDefault: mockPreventDefault,
  } as unknown as React.TouchEvent;
}

describe('useImageSwipe touch handling', () => {
  it('[regression] does not block default when move fires without active drag', () => {
    const { result } = renderHook(() =>
      useImageSwipe({
        totalImages: 3,
        enableSwipe: true,
      }),
    );

    const movePreventDefault = vi.fn();
    const moveEvent = makeTouchEvent(180, 210, movePreventDefault);

    act(() => {
      result.current.handleTouchMove(moveEvent);
    });

    expect(movePreventDefault).not.toHaveBeenCalled();
  });

  it('[post-fix] does not block default scrolling on touch start', () => {
    const { result } = renderHook(() =>
      useImageSwipe({
        totalImages: 3,
      }),
    );

    const startEvent = makeTouchEvent(100, 200);

    act(() => {
      result.current.handleTouchStart(startEvent);
    });

    expect(startEvent.preventDefault).not.toHaveBeenCalled();
  });

  it('blocks default only for horizontal swipe movement', () => {
    const { result } = renderHook(() =>
      useImageSwipe({
        totalImages: 3,
        enableSwipe: true,
      }),
    );

    const startPreventDefault = vi.fn();
    const movePreventDefault = vi.fn();
    const startEvent = makeTouchEvent(100, 200, startPreventDefault);
    const horizontalMoveEvent = makeTouchEvent(180, 210, movePreventDefault);

    act(() => {
      result.current.handleTouchStart(startEvent);
      result.current.handleTouchMove(horizontalMoveEvent);
    });

    expect(movePreventDefault).toHaveBeenCalled();
  });

  it('does not block default for vertical movement', () => {
    const { result } = renderHook(() =>
      useImageSwipe({
        totalImages: 3,
        enableSwipe: true,
      }),
    );

    const startPreventDefault = vi.fn();
    const movePreventDefault = vi.fn();
    const startEvent = makeTouchEvent(100, 200, startPreventDefault);
    const verticalMoveEvent = makeTouchEvent(105, 280, movePreventDefault);

    act(() => {
      result.current.handleTouchStart(startEvent);
      result.current.handleTouchMove(verticalMoveEvent);
    });

    expect(movePreventDefault).not.toHaveBeenCalled();
  });
});
