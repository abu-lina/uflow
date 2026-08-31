/* eslint-disable jsx-a11y/aria-role */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessage } from '@/features/chat/components/ChatMessage';
import type { ProviderCardData } from '@/features/chat/types';

const mockProvider: ProviderCardData = {
  provider_id: 'p1',
  provider_name: 'Döner Haus',
  address_city: 'Berlin',
  category_name: 'Türkisch',
  listing_type: 'food',
  muslim_owned: true,
  has_prayer_space: false,
  family_friendly: true,
  women_friendly: false,
};

describe('ChatMessage', () => {
  it('renders user message aligned to the right', () => {
    render(<ChatMessage role="user" content="Hallo!" />);

    const message = screen.getByText('Hallo!');
    expect(message).toBeInTheDocument();

    const container = message.closest('[data-role="user"]');
    expect(container).toBeInTheDocument();
  });

  it('renders assistant message aligned to the left', () => {
    render(
      <ChatMessage
        role="assistant"
        content="Wie kann ich dir helfen?"
      />,
    );

    const message = screen.getByText('Wie kann ich dir helfen?');
    expect(message).toBeInTheDocument();

    const container = message.closest('[data-role="assistant"]');
    expect(container).toBeInTheDocument();
  });

  it('shows typing indicator when content is empty and loading', () => {
    render(<ChatMessage role="assistant" content="" isLoading={true} />);

    const indicator = screen.getByTestId('typing-indicator');
    expect(indicator).toBeInTheDocument();
  });

  it('renders tool message with muted style', () => {
    render(<ChatMessage role="tool" content="Executed search_providers" />);

    const container = screen.getByText('Executed search_providers').closest('[data-role="tool"]');
    expect(container).toBeInTheDocument();
  });

  it('renders SuggestionCard for each provider result', () => {
    render(
      <ChatMessage
        role="assistant"
        content="Ich habe folgende Restaurants gefunden:"
        results={[mockProvider]}
      />,
    );

    expect(screen.getByText('Döner Haus')).toBeInTheDocument();
    expect(screen.getByText('Berlin | Türkisch')).toBeInTheDocument();
  });

  it('hides content text when results are present', () => {
    render(
      <ChatMessage
        role="assistant"
        content="Hier sind die Ergebnisse:"
        results={[mockProvider]}
      />,
    );

    expect(screen.queryByText('Hier sind die Ergebnisse:')).not.toBeInTheDocument();
    expect(screen.getByText('Döner Haus')).toBeInTheDocument();
  });

  it('renders multiple SuggestionCards for multiple results', () => {
    const providers = [
      mockProvider,
      {
        ...mockProvider,
        provider_id: 'p2',
        provider_name: 'Kebab Haus',
        address_city: 'München',
        category_name: 'Türkisch',
      },
    ];

    render(
      <ChatMessage
        role="assistant"
        content="Ich habe diese gefunden:"
        results={providers}
      />,
    );

    expect(screen.getByText('Döner Haus')).toBeInTheDocument();
    expect(screen.getByText('Kebab Haus')).toBeInTheDocument();
    expect(screen.getByText('München | Türkisch')).toBeInTheDocument();
  });

  it('renders provider card as a link to the provider detail page', () => {
    const onOptionSelect = vi.fn();

    render(
      <ChatMessage
        role="assistant"
        content="Ergebnisse:"
        results={[mockProvider]}
        onOptionSelect={onOptionSelect}
      />,
    );

    const link = screen.getByRole('link', { name: /Döner Haus/ });

    expect(link).toHaveAttribute('href', '/providers/p1');
  });

  it('suppresses options when results are already shown', () => {
    const onOptionSelect = vi.fn();

    render(
      <ChatMessage
        role="assistant"
        content="Ich habe Vorschläge:"
        results={[mockProvider]}
        options={['Option A', 'Option B']}
        onOptionSelect={onOptionSelect}
      />,
    );

    expect(screen.getByText('Döner Haus')).toBeInTheDocument();
    expect(screen.queryByTestId('quick-replies')).not.toBeInTheDocument();
  });

  it('renders options when no results exist', () => {
    const onOptionSelect = vi.fn();

    render(
      <ChatMessage
        role="assistant"
        content="Was möchtest du wissen?"
        options={['Option A', 'Option B']}
        onOptionSelect={onOptionSelect}
      />,
    );

    expect(screen.getByText('Was möchtest du wissen?')).toBeInTheDocument();
    expect(screen.getByTestId('quick-replies')).toBeInTheDocument();
  });
});
