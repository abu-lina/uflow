import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// ContactCheckbox is not exported from the module — it's defined inline.
// We need to extract and test its behavior through a minimal reproduction.
// This test file validates the focus management behavior that the ContactCheckbox
// component SHOULD have: no auto-focus on mount when checked is initially true,
// but focus DOES occur when user toggles from unchecked → checked.

// Minimal reproduction of the ContactCheckbox focus logic for isolated testing.
// The production fix will apply to the inline component in StreamlinedRecommendForm.tsx
// and StreamlinedImportForm.tsx.
import React, { useRef, useEffect, useCallback, memo } from 'react';

interface ContactCheckboxProps {
  label: string;
  checked: boolean;
  value: string;
  placeholder: string;
  type?: string;
  onToggle: () => void;
  onChange: (value: string) => void;
}

/**
 * BuggyContactCheckbox — reproduces the broken behavior (auto-focus on mount).
 * This is used only in the "Red" phase to prove the test catches the bug.
 */
const BuggyContactCheckbox = memo(({
  label,
  checked,
  value,
  placeholder,
  type = 'text',
  onToggle,
  onChange,
}: ContactCheckboxProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // BUG: This fires on mount when checked is initially true (restored from localStorage)
  useEffect(() => {
    if (checked && inputRef.current) {
      inputRef.current.focus();
    }
  }, [checked]);

  return (
    <div
      aria-checked={checked}
      role="checkbox"
      tabIndex={0}
      onClick={onToggle}
    >
      {checked ? (
        <input
          ref={inputRef}
          aria-label={label}
          placeholder={placeholder}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span>{label}</span>
      )}
    </div>
  );
});
BuggyContactCheckbox.displayName = 'BuggyContactCheckbox';

/**
 * FixedContactCheckbox — the expected correct behavior.
 * Only focuses input when user explicitly toggles from unchecked → checked,
 * NOT on initial mount, programmatic state changes, or autocomplete auto-selection.
 * Uses a userToggledRef that is set only inside the component's own click/key handlers.
 */
const FixedContactCheckbox = memo(({
  label,
  checked,
  value,
  placeholder,
  type = 'text',
  onToggle,
  onChange,
}: ContactCheckboxProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const userToggledRef = useRef(false);

  // Focus input only when the toggle was initiated by a user action inside this component
  useEffect(() => {
    if (userToggledRef.current && checked && inputRef.current) {
      inputRef.current.focus();
    }
    userToggledRef.current = false;
  }, [checked]);

  const handleToggle = useCallback(() => {
    userToggledRef.current = true;
    onToggle();
  }, [onToggle]);

  return (
    <div
      aria-checked={checked}
      role="checkbox"
      tabIndex={0}
      onClick={handleToggle}
    >
      {checked ? (
        <input
          ref={inputRef}
          aria-label={label}
          placeholder={placeholder}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span>{label}</span>
      )}
    </div>
  );
});
FixedContactCheckbox.displayName = 'FixedContactCheckbox';

// ---- Tests ----

describe('ContactCheckbox focus management', () => {
  const defaultProps = {
    label: 'Instagram',
    value: '@henpoint',
    placeholder: '@username',
    type: 'text' as const,
    onToggle: vi.fn(),
    onChange: vi.fn(),
  };

  describe('when mounted with checked=true (restored from localStorage)', () => {
    it('BuggyContactCheckbox auto-focuses on mount (proves the bug exists)', () => {
      render(
        <BuggyContactCheckbox {...defaultProps} checked={true} />
      );
      const input = screen.getByRole('textbox', { name: 'Instagram' });
      // The buggy version DOES focus on mount — this is the behavior we want to eliminate
      expect(document.activeElement).toBe(input);
    });

    it('FixedContactCheckbox does NOT auto-focus on mount', () => {
      render(
        <FixedContactCheckbox {...defaultProps} checked={true} />
      );
      const input = screen.getByRole('textbox', { name: 'Instagram' });
      // The fixed version should NOT focus the input on initial render
      expect(document.activeElement).not.toBe(input);
    });
  });

  describe('when user toggles from unchecked → checked', () => {
    it('FixedContactCheckbox focuses input after user-initiated toggle', () => {
      // Start unchecked, then simulate a toggle to checked
      const ToggleWrapper = () => {
        const [checked, setChecked] = React.useState(false);
        return (
          <FixedContactCheckbox
            {...defaultProps}
            checked={checked}
            onToggle={() => setChecked(true)}
          />
        );
      };

      render(<ToggleWrapper />);

      // Initially unchecked — no input visible
      expect(screen.queryByRole('textbox')).toBeNull();

      // Toggle by clicking the checkbox
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      // After user toggle, input should appear and be focused
      const input = screen.getByRole('textbox', { name: 'Instagram' });
      expect(document.activeElement).toBe(input);
    });
  });

  describe('when checked changes programmatically (e.g., autocomplete auto-select)', () => {
    it('FixedContactCheckbox does NOT focus when checked is set programmatically after mount', () => {
      // Simulates handleProviderNameSelect auto-selecting a contact method:
      // the parent sets checked=true without the user clicking the checkbox.
      const ProgrammaticWrapper = () => {
        const [checked, setChecked] = React.useState(false);
        return (
          <div>
            <button data-testid="auto-select" onClick={() => setChecked(true)}>
              Auto-select
            </button>
            <FixedContactCheckbox
              {...defaultProps}
              checked={checked}
              onToggle={() => setChecked((prev) => !prev)}
            />
          </div>
        );
      };

      render(<ProgrammaticWrapper />);

      // Initially unchecked — no input
      expect(screen.queryByRole('textbox')).toBeNull();

      // Programmatically set checked=true (simulating autocomplete handler)
      fireEvent.click(screen.getByTestId('auto-select'));

      // Input should appear but should NOT be focused
      const input = screen.getByRole('textbox', { name: 'Instagram' });
      expect(document.activeElement).not.toBe(input);
    });
  });

  describe('when re-rendered with checked=true (e.g., parent re-render)', () => {
    it('FixedContactCheckbox does NOT re-focus on subsequent re-renders', () => {
      // Render initially checked
      const { rerender } = render(
        <FixedContactCheckbox {...defaultProps} checked={true} />
      );
      const input = screen.getByRole('textbox', { name: 'Instagram' });

      // Confirm no focus on mount
      expect(document.activeElement).not.toBe(input);

      // Blur the input explicitly, then re-render with same props
      input.blur();

      rerender(
        <FixedContactCheckbox {...defaultProps} checked={true} />
      );

      // Should still not be focused after re-render with same checked value
      expect(document.activeElement).not.toBe(input);
    });
  });
});
