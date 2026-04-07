import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Modal } from '@/components/ui/Modal';

// Helper: renders a Modal with a triggering button tracking focus
function renderModal(props: Partial<React.ComponentProps<typeof Modal>> = {}) {
  const onClose = vi.fn();
  return {
    onClose,
    ...render(
      <div>
        <button data-testid="trigger">Open</button>
        <Modal isOpen={true} onClose={onClose} title="Test modal" {...props}>
          <button data-testid="inside-btn-1">First</button>
          <button data-testid="inside-btn-2">Last</button>
        </Modal>
      </div>,
    ),
  };
}

describe('Modal — Gap 7: aria-labelledby wiring', () => {
  it('dialog has aria-labelledby pointing to an element containing the title', () => {
    renderModal({ title: 'My Dialog' });
    const dialog = screen.getByRole('dialog');
    const labelId = dialog.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    const labelEl = document.getElementById(labelId!);
    expect(labelEl).not.toBeNull();
    expect(labelEl!.textContent).toBe('My Dialog');
  });

  it('dialog has no aria-labelledby when title is not provided', () => {
    render(
      <Modal isOpen={true} onClose={vi.fn()}>
        <button>inside</button>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-labelledby')).toBeNull();
  });
});

describe('Modal — Gap 4: Escape key scoping', () => {
  it('calls onClose on Escape keyup when focus is inside modal', () => {
    const { onClose } = renderModal();
    const btn = screen.getByTestId('inside-btn-1');
    btn.focus();
    fireEvent.keyUp(btn, { key: 'Escape', bubbles: true });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose on Escape keyup when target is outside modal', () => {
    const { onClose } = renderModal();
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    fireEvent.keyUp(outside, { key: 'Escape', bubbles: true });
    expect(onClose).not.toHaveBeenCalled();
    document.body.removeChild(outside);
  });

  it('[pre-fix FAILS] keydown fires on auto-repeat — keyup must be used instead', () => {
    // This test documents that the listener is on keyup, not keydown
    const { onClose } = renderModal();
    const btn = screen.getByTestId('inside-btn-1');
    btn.focus();
    // keyup fires once per key release — should call onClose once
    fireEvent.keyUp(btn, { key: 'Escape', bubbles: true });
    fireEvent.keyUp(btn, { key: 'Escape', bubbles: true });
    // (If called twice, that would be expected for two separate key releases,
    // but auto-repeat keydown would fire many times for single hold)
    expect(onClose).toHaveBeenCalledTimes(2); // two separate releases = two calls
  });
});

describe('Modal — Gap 5: drag-close prevention', () => {
  it('does NOT close when mousedown is inside content but click fires on backdrop', () => {
    const { onClose } = renderModal();
    const dialog = screen.getByRole('dialog');
    const insideBtn = screen.getByTestId('inside-btn-1');
    // Mousedown on content, then click on backdrop (parent)
    fireEvent.mouseDown(insideBtn);
    fireEvent.click(dialog); // backdrop-level click
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes when both mousedown and click are on the backdrop', () => {
    const { onClose } = renderModal();
    // The backdrop is the div with aria-hidden inside the dialog element
    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.querySelector('[aria-hidden="true"]') as Element;
    expect(backdrop).not.toBeNull();
    fireEvent.mouseDown(backdrop);
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Modal — Gap 9: z-index layering', () => {
  it('modal content has higher stacking order than backdrop', () => {
    renderModal();
    const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    const content = document.querySelector('[data-testid="modal-content"]') as HTMLElement;
    // Both exist
    expect(backdrop).not.toBeNull();
    expect(content).not.toBeNull();
    // Compute z-index values from class names — backdrop should be z-0 (or absent), content z-10
    const backdropClass = backdrop.className;
    const contentClass = content.className;
    // Content must NOT have the same z-index as the backdrop collision point
    expect(contentClass).toContain('z-10');
    expect(backdropClass).not.toContain('z-[999999]');
  });
});

describe('Modal — Gap 3: aria-hidden on background', () => {
  it('sets aria-hidden on body siblings while open', () => {
    // Add a sibling to body to test
    const sibling = document.createElement('div');
    sibling.id = 'bg-sibling';
    document.body.appendChild(sibling);

    renderModal();
    expect(sibling.getAttribute('aria-hidden')).toBe('true');

    document.body.removeChild(sibling);
  });
});

describe('Modal — Gap 1+2: focus trap and restoration', () => {
  it('sets initial focus inside the modal on open', () => {
    renderModal();
    const firstBtn = screen.getByTestId('inside-btn-1');
    expect(document.activeElement).toBe(firstBtn);
  });
});

describe('Modal — Gap 8: exit animation / delayed unmount', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children while isOpen is true', () => {
    renderModal({ isOpen: true });
    expect(screen.getByTestId('inside-btn-1')).toBeInTheDocument();
  });

  it('when parent mounts isOpen=true and unmounts, cleanup runs without error', () => {
    const { unmount } = renderModal({ isOpen: true });
    expect(() => unmount()).not.toThrow();
  });
});
