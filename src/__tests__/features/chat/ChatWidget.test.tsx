import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatWidget } from '@/features/chat/components/ChatWidget';

const mockUseChat = vi.fn();

vi.mock('@/features/chat/hooks/useChat', () => ({
  useChat: () => mockUseChat(),
}));

vi.mock('@/providers/LanguageProvider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'de',
  }),
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

    expect(screen.getByText(/As-Salamu-Aleikum/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Wie kann ich dir helfen/i),
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

  it('renders SuggestionCard when message has results', () => {
    const mockResults = [
      {
        provider_id: 'p1',
        provider_name: 'Döner Haus',
        address_city: 'Berlin',
        category_name: 'Türkisch',
        listing_type: 'food',
        muslim_owned: true,
        has_prayer_space: false,
        family_friendly: true,
        women_friendly: false,
      },
    ];

    mockUseChat.mockReturnValue(
      mockChatState({
        messages: [
          { role: 'user', content: 'Finde Döner in Berlin' },
          {
            role: 'assistant',
            content: 'Ich habe folgende Restaurants gefunden:',
            results: mockResults,
          },
        ],
      }),
    );

    render(<ChatWidget />);

    expect(screen.getByText('Döner Haus')).toBeInTheDocument();
    expect(screen.getByText('Berlin | Türkisch')).toBeInTheDocument();
  });

  // Plan 197 — auth-required card shows generic chat message, not restaurant-registration text
  it('[pre-fix FAILS] auth-required error does NOT show restaurant-registration text', () => {
    mockUseChat.mockReturnValue(
      mockChatState({ error: 'Authentication required' }),
    );

    render(<ChatWidget />);

    expect(screen.queryByText(/Restaurant zu registrieren/i)).not.toBeInTheDocument();
  });

  it('[pre-fix FAILS] auth-required error card uses i18n key for body text', () => {
    mockUseChat.mockReturnValue(
      mockChatState({ error: 'Authentication required' }),
    );

    render(<ChatWidget />);

    // t() returns the key itself — so we expect the key, not hardcoded German
    expect(screen.getByText('chat.authRequired.body')).toBeInTheDocument();
  });
});
