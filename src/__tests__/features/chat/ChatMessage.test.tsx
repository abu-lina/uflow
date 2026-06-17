import { describe, it, expect } from 'vitest';
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

  it('[G1] renders ProviderCard when results are passed', () => {
    render(
      <ChatMessage
        role="assistant"
        content="Ich habe folgende Restaurants gefunden:"
        results={[mockProvider]}
      />,
    );

    expect(screen.getByText('Döner Haus')).toBeInTheDocument();
    expect(screen.getByText('Berlin')).toBeInTheDocument();
    expect(screen.getByText('Muslim-geführt')).toBeInTheDocument();
    expect(screen.getByText('Familienfreundlich')).toBeInTheDocument();
  });

  it('[G1] renders content text alongside ProviderCards', () => {
    render(
      <ChatMessage
        role="assistant"
        content="Hier sind die Ergebnisse:"
        results={[mockProvider]}
      />,
    );

    expect(screen.getByText('Hier sind die Ergebnisse:')).toBeInTheDocument();
    expect(screen.getByText('Döner Haus')).toBeInTheDocument();
  });

  it('[G1] renders multiple ProviderCards for multiple results', () => {
    const providers = [
      mockProvider,
      {
        ...mockProvider,
        provider_id: 'p2',
        provider_name: 'Kebab Haus',
        provider_address: 'München',
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
  });
});
