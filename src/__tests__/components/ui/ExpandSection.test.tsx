import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ExpandSection } from '@/components/ui/ExpandSection';

describe('ExpandSection', () => {
  it('renders the title text', () => {
    render(<ExpandSection title="Test Section">Content</ExpandSection>);
    expect(screen.getByText('Test Section')).toBeInTheDocument();
  });

  it('hides body by default when defaultOpen is not set', () => {
    render(<ExpandSection title="Test Section">Body content</ExpandSection>);
    expect(screen.queryByText('Body content')).not.toBeInTheDocument();
  });

  it('shows body by default when defaultOpen is true', () => {
    render(
      <ExpandSection title="Test Section" defaultOpen>
        Body content
      </ExpandSection>
    );
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('toggles body visibility when header is clicked', () => {
    render(<ExpandSection title="Test Section">Toggled content</ExpandSection>);

    // Initially hidden
    expect(screen.queryByText('Toggled content')).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(screen.getByRole('button', { name: /Test Section/i }));
    expect(screen.getByText('Toggled content')).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(screen.getByRole('button', { name: /Test Section/i }));
    expect(screen.queryByText('Toggled content')).not.toBeInTheDocument();
  });

  it('rotates chevron icon when toggled', () => {
    render(<ExpandSection title="Test Section">Content</ExpandSection>);

    const button = screen.getByRole('button', { name: /Test Section/i });
    const svg = button.querySelector('svg');
    
    // Initially not rotated
    expect(svg).not.toHaveClass('rotate-180');

    // Click to expand
    fireEvent.click(button);
    expect(svg).toHaveClass('rotate-180');

    // Click to collapse
    fireEvent.click(button);
    expect(svg).not.toHaveClass('rotate-180');
  });
});
