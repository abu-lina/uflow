'use client';

import { useEffect, useId, useRef } from 'react';

import { createPortal } from 'react-dom';

import { useAriaHidden } from '@/hooks/useAriaHidden';
import { useDelayedUnmount } from '@/hooks/useDelayedUnmount';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useScrollLock } from '@/hooks/useScrollLock';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function Modal({ isOpen, onClose, children, title }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Track mousedown origin to prevent drag-close (Gap 5)
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  // Gap 6: stack-safe scroll lock
  useScrollLock(isOpen);
  // Gap 3: hide background from screen readers
  useAriaHidden(dialogRef, isOpen);
  // Gap 1+2: focus trap + focus restoration
  useFocusTrap(dialogRef, isOpen);
  // Gap 8: delayed unmount for exit animation
  const { shouldRender, isAnimating } = useDelayedUnmount(isOpen);

  // Gap 4: Escape on keyup, scoped via contains(), with stopPropagation
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (!dialogRef.current?.contains(e.target as Node)) return;
      e.stopPropagation();
      onClose();
    };

    if (isOpen) {
      document.addEventListener('keyup', handleEscape);
    }

    return () => {
      document.removeEventListener('keyup', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!shouldRender) {
    return null;
  }

  return createPortal(
    <div
      ref={dialogRef}
      aria-labelledby={title ? titleId : undefined}
      aria-modal="true"
      className={`fixed inset-0 z-[999999] flex items-center justify-center transition-opacity duration-300 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      // Gap 5: track mousedown origin for drag-close prevention
      onMouseDown={(e) => {
        mouseDownTargetRef.current = e.target;
      }}
    >
      {/* Gap 7: visually-hidden title for aria-labelledby */}
      {title && (
        <span className="sr-only" id={titleId}>
          {title}
        </span>
      )}

      {/* Backdrop — Gap 9: no explicit z-index (z-0 relative to wrapper) */}
      <div
        ref={backdropRef}
        aria-hidden="true"
        className="fixed inset-0 z-0 bg-black/40 backdrop-blur-sm"
        onClick={() => {
          // Gap 5: only close if mousedown also originated on the backdrop
          if (
            mouseDownTargetRef.current === backdropRef.current ||
            backdropRef.current?.contains(mouseDownTargetRef.current as Node)
          ) {
            onClose();
          }
          mouseDownTargetRef.current = null;
        }}
      />

      {/* Modal Content — Gap 9: z-10 is higher than backdrop z-0 within same stacking context */}
      <div
        className="hide-scrollbar relative z-10 mx-auto max-h-[90vh] w-full max-w-[1200px] overflow-y-auto"
        data-testid="modal-content"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
