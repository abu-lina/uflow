'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

import { useLanguage } from '@/providers/LanguageProvider';

interface HalalMeatDefinitionPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HalalMeatDefinitionPopup({ isOpen, onClose }: HalalMeatDefinitionPopupProps) {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }

      if (event.key !== 'Tab') {
        return;
      }

      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

      const focusableElements = dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );

      if (focusableElements.length === 0) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        aria-modal="true"
        className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          aria-label={t('providerDetail.popup.closeAria')}
          className="absolute right-3 top-3 rounded-full p-2 text-content hover:bg-neutral-100"
          type="button"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="mb-3 pe-8 text-lg font-semibold text-content-heading">
          {t('providerDetail.popup.halalMeatDefinitionTitle')}
        </h2>
        <p
          className="whitespace-pre-line text-sm leading-relaxed text-content"
          dangerouslySetInnerHTML={{ __html: t('providerDetail.popup.halalMeatDefinition') }}
        />
      </div>
    </div>
  );
}
