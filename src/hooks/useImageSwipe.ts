import { useState, useRef, useCallback, useEffect } from 'react';

interface UseImageSwipeOptions {
  totalImages: number;
  enableSwipe?: boolean;
  swipeThreshold?: number;
  boundaryResistance?: number;
  velocityThreshold?: number;
  minSwipeDistance?: number;
}

interface UseImageSwipeReturn {
  selectedImageIdx: number;
  isDragging: boolean;
  dragOffset: number;
  imageContainerRef: React.RefObject<HTMLDivElement>;
  goToNext: () => void;
  goToPrevious: () => void;
  goToImage: (index: number) => void;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  getTransformStyle: () => React.CSSProperties;
  getSwipeProgress: () => number;
}

export const useImageSwipe = ({
  totalImages,
  enableSwipe = true,
  swipeThreshold = 60,
  boundaryResistance = 0.15,
  velocityThreshold = 0.3,
  minSwipeDistance = 30,
}: UseImageSwipeOptions): UseImageSwipeReturn => {
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  
  // Use refs for immediate access in callbacks to avoid closure stale values
  const dragStartXRef = useRef<number>(0);
  const dragStartYRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  
  // Velocity tracking for better swipe detection
  const touchStartTime = useRef<number>(0);
  const lastTouchTime = useRef<number>(0);
  const lastTouchX = useRef<number>(0);

  // Navigation functions
  const goToNext = useCallback(() => {
    setSelectedImageIdx((prev) => (prev + 1) % totalImages);
  }, [totalImages]);

  const goToPrevious = useCallback(() => {
    setSelectedImageIdx((prev) => (prev - 1 + totalImages) % totalImages);
  }, [totalImages]);

  const goToImage = useCallback((index: number) => {
    setSelectedImageIdx(index);
  }, []);

  // Touch/Swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enableSwipe || totalImages <= 1 || !e.touches.length) return;
    
    setIsDragging(true);
    isDraggingRef.current = true;
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    dragStartXRef.current = touchX;
    dragStartYRef.current = touchY;
    setDragOffset(0);
    
    // Initialize velocity tracking
    const now = Date.now();
    touchStartTime.current = now;
    lastTouchTime.current = now;
    lastTouchX.current = touchX;
  }, [enableSwipe, totalImages]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enableSwipe || !isDraggingRef.current || totalImages <= 1 || !e.touches.length) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const currentTime = Date.now();
    const offsetX = currentX - dragStartXRef.current;
    const offsetY = Math.abs(currentY - dragStartYRef.current);

    // Update velocity tracking
    lastTouchX.current = currentX;
    lastTouchTime.current = currentTime;

    // Only handle horizontal swipes, let vertical scrolls pass through
    if (Math.abs(offsetX) > offsetY) {
      // Prevent swiping beyond boundaries with resistance
      if (
        (selectedImageIdx === 0 && offsetX > 0) ||
        (selectedImageIdx === totalImages - 1 && offsetX < 0)
      ) {
        setDragOffset(offsetX * boundaryResistance);
      } else {
        setDragOffset(offsetX);
      }
      // Prevent default to avoid scrolling
      e.preventDefault();
    }
  }, [enableSwipe, totalImages, selectedImageIdx, boundaryResistance]);

  const handleTouchEnd = useCallback(() => {
    if (!enableSwipe || !isDraggingRef.current || totalImages <= 1) {
      isDraggingRef.current = false;
      setIsDragging(false);
      setDragOffset(0);
      return;
    }

    const endTime = Date.now();
    const duration = endTime - touchStartTime.current;
    const velocity = Math.abs(dragOffset) / duration; // pixels per ms

    // Determine if swipe should trigger based on distance or velocity
    const shouldSwipe = 
      Math.abs(dragOffset) > swipeThreshold || 
      (Math.abs(dragOffset) > minSwipeDistance && velocity > velocityThreshold);

    if (shouldSwipe) {
      if (dragOffset > 0 && selectedImageIdx > 0) {
        goToPrevious();
      } else if (dragOffset < 0 && selectedImageIdx < totalImages - 1) {
        goToNext();
      }
    }
    isDraggingRef.current = false;
    setIsDragging(false);
    setDragOffset(0);
  }, [enableSwipe, totalImages, dragOffset, swipeThreshold, minSwipeDistance, velocityThreshold, selectedImageIdx, goToNext, goToPrevious]);

  // Mouse event handlers for desktop testing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!enableSwipe || totalImages <= 1) return;
    
    setIsDragging(true);
    isDraggingRef.current = true;
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    dragStartXRef.current = mouseX;
    dragStartYRef.current = mouseY;
    setDragOffset(0);
    
    touchStartTime.current = Date.now();
    lastTouchTime.current = touchStartTime.current;
    lastTouchX.current = mouseX;
    
    e.preventDefault();
  }, [enableSwipe, totalImages]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!enableSwipe || !isDraggingRef.current || totalImages <= 1) return;

    const currentX = e.clientX;
    const currentY = e.clientY;
    const currentTime = Date.now();
    const offsetX = currentX - dragStartXRef.current;
    const offsetY = Math.abs(currentY - dragStartYRef.current);


    lastTouchX.current = currentX;
    lastTouchTime.current = currentTime;

    if (Math.abs(offsetX) > offsetY) {
      if (
        (selectedImageIdx === 0 && offsetX > 0) ||
        (selectedImageIdx === totalImages - 1 && offsetX < 0)
      ) {
        setDragOffset(offsetX * boundaryResistance);
      } else {
        setDragOffset(offsetX);
      }
      e.preventDefault();
    }
  }, [enableSwipe, totalImages, selectedImageIdx, boundaryResistance]);

  const handleMouseUp = useCallback(() => {
    if (!enableSwipe || !isDraggingRef.current || totalImages <= 1) {
      isDraggingRef.current = false;
      setIsDragging(false);
      setDragOffset(0);
      return;
    }

    const endTime = Date.now();
    const duration = endTime - touchStartTime.current;
    const velocity = Math.abs(dragOffset) / duration;

    const shouldSwipe = 
      Math.abs(dragOffset) > swipeThreshold || 
      (Math.abs(dragOffset) > minSwipeDistance && velocity > velocityThreshold);

    if (shouldSwipe) {
      if (dragOffset > 0 && selectedImageIdx > 0) {
        goToPrevious();
      } else if (dragOffset < 0 && selectedImageIdx < totalImages - 1) {
        goToNext();
      }
    }
    isDraggingRef.current = false;
    setIsDragging(false);
    setDragOffset(0);
  }, [enableSwipe, totalImages, dragOffset, swipeThreshold, minSwipeDistance, velocityThreshold, selectedImageIdx, goToNext, goToPrevious]);

  // Add global mouse event listeners for better tracking
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        handleMouseMove(e as unknown as React.MouseEvent);
      };
      const handleGlobalMouseUp = () => {
        handleMouseUp();
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const getTransformStyle = useCallback((): React.CSSProperties => {
    const baseTransform = isDragging && Math.abs(dragOffset) > 10
      ? `translateX(calc(-${selectedImageIdx * 100}% + ${dragOffset}px))`
      : `translateX(-${selectedImageIdx * 100}%)`;

    // Add visual feedback during dragging
    let visualEffects = '';
    if (isDragging && Math.abs(dragOffset) > 20) {
      const progress = Math.min(Math.abs(dragOffset) / 100, 1);
      const scale = 1 - (progress * 0.02); // Slight scale down
      visualEffects = ` scale(${scale})`;
    }

    return {
      transform: baseTransform + visualEffects,
      transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      opacity: isDragging && Math.abs(dragOffset) > 50 ? 0.95 : 1,
    };
  }, [isDragging, dragOffset, selectedImageIdx]);

  const getSwipeProgress = useCallback((): number => {
    if (!isDragging) return 0;
    return Math.min(Math.abs(dragOffset) / swipeThreshold, 1);
  }, [isDragging, dragOffset, swipeThreshold]);

  return {
    selectedImageIdx,
    isDragging,
    dragOffset,
    imageContainerRef,
    goToNext,
    goToPrevious,
    goToImage,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    getTransformStyle,
    getSwipeProgress,
  };
};
