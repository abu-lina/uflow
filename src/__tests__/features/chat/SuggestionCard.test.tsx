import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SuggestionCard } from '@/features/chat/components/SuggestionCard';
import { Sparkles } from 'lucide-react';

describe('SuggestionCard', () => {
  it('renders icon, title and subtitle', () => {
    render(
      <SuggestionCard
        icon={<Sparkles size={24} data-testid="test-icon" />}
        title="Test Title"
        subtitle="Test Subtitle"
      />
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('triggers onClick when clicked', () => {
    const onClick = vi.fn();
    render(
      <SuggestionCard
        icon={<Sparkles size={24} />}
        title="Clickable"
        onClick={onClick}
      />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders without subtitle', () => {
    render(
      <SuggestionCard
        icon={<Sparkles size={24} />}
        title="No Subtitle"
      />
    );
    expect(screen.getByText('No Subtitle')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <SuggestionCard
        icon={<Sparkles size={24} />}
        title="Styled"
        className="custom-class"
      />
    );
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('renders as a button', () => {
    render(
      <SuggestionCard
        icon={<Sparkles size={24} />}
        title="Button Test"
      />
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
