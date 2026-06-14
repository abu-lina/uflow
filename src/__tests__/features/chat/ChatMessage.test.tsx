import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessage } from '@/features/chat/components/ChatMessage';

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
});
