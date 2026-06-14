import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatWidget } from '@/features/chat/components/ChatWidget';

const mockUseChat = vi.fn();

vi.mock('@/features/chat/hooks/useChat', () => ({
  useChat: () => mockUseChat(),
}));

function mockChatState(overrides: Record<string, unknown> = {}) {
  return {
    messages: [],
    isLoading: false,
    error: null,
    conversationId: null,
    sendMessage: vi.fn(),
    ...overrides,
  };
}

describe('ChatWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows welcome greeting when no messages', () => {
    mockUseChat.mockReturnValue(mockChatState());

    render(<ChatWidget />);

    expect(screen.getByText(/UFlow Assistant/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Restaurants, Geschäfte/i),
    ).toBeInTheDocument();
  });

  it('shows loading indicator when isLoading is true', () => {
    mockUseChat.mockReturnValue(
      mockChatState({
        messages: [{ role: 'user', content: 'Hallo' }],
        isLoading: true,
      }),
    );

    render(<ChatWidget />);

    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
  });

  it('shows error message when error is present', () => {
    mockUseChat.mockReturnValue(
      mockChatState({
        error: 'Netzwerkfehler',
      }),
    );

    render(<ChatWidget />);

    expect(screen.getByText(/Netzwerkfehler/i)).toBeInTheDocument();
  });

  it('renders messages when present', () => {
    mockUseChat.mockReturnValue(
      mockChatState({
        messages: [
          { role: 'user', content: 'Hallo' },
          { role: 'assistant', content: 'Wie kann ich helfen?' },
        ],
      }),
    );

    render(<ChatWidget />);

    expect(screen.getByText('Hallo')).toBeInTheDocument();
    expect(screen.getByText('Wie kann ich helfen?')).toBeInTheDocument();
  });

  it('calls sendMessage when user types and sends', async () => {
    const sendMessage = vi.fn();
    mockUseChat.mockReturnValue(
      mockChatState({ sendMessage }),
    );

    render(<ChatWidget />);

    const textarea = screen.getByPlaceholderText(/Nachricht/i);
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.click(screen.getByRole('button', { name: /Send/i }));

    expect(sendMessage).toHaveBeenCalledWith('Test message');
  });
});
