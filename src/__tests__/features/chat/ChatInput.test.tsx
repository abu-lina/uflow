import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from '@/features/chat/components/ChatInput';

describe('ChatInput', () => {
  it('renders textarea and send button', () => {
    render(<ChatInput onSend={vi.fn()} />);

    expect(screen.getByPlaceholderText(/Nachricht schreiben/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send message/i })).toBeInTheDocument();
  });

  it('disables input and button when isLoading is true', () => {
    render(<ChatInput onSend={vi.fn()} isLoading={true} />);

    const textarea = screen.getByPlaceholderText(/Nachricht schreiben/i);
    const button = screen.getByRole('button', { name: /Send message/i });

    expect(textarea).toBeDisabled();
    expect(button).toBeDisabled();
  });

  it('calls onSend with trimmed message on click', () => {
    const onSend = vi.fn();

    render(<ChatInput onSend={onSend} />);

    const textarea = screen.getByPlaceholderText(/Nachricht schreiben/i);
    fireEvent.change(textarea, { target: { value: '  Hallo Welt  ' } });
    fireEvent.click(screen.getByRole('button', { name: /Send message/i }));

    expect(onSend).toHaveBeenCalledWith('Hallo Welt');
  });

  it('calls onSend when Enter is pressed', () => {
    const onSend = vi.fn();

    render(<ChatInput onSend={onSend} />);

    const textarea = screen.getByPlaceholderText(/Nachricht schreiben/i);
    fireEvent.change(textarea, { target: { value: 'Test' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(onSend).toHaveBeenCalledWith('Test');
  });

  it('does not send empty messages', () => {
    const onSend = vi.fn();

    render(<ChatInput onSend={onSend} />);

    const button = screen.getByRole('button', { name: /Send message/i });
    fireEvent.click(button);

    expect(onSend).not.toHaveBeenCalled();
  });

  it('clears textarea after sending', () => {
    const onSend = vi.fn();

    render(<ChatInput onSend={onSend} />);

    const textarea = screen.getByPlaceholderText(/Nachricht schreiben/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(textarea.value).toBe('');
  });
});
