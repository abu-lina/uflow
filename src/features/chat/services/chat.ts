import type { ChatRequest, ChatResponse, ConversationListItem, ConversationWithMessages } from '@/features/chat/types';

export async function sendMessage(
  request: ChatRequest,
): Promise<ChatResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `Chat request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getConversations(): Promise<ConversationListItem[]> {
  const response = await fetch('/api/chat/conversations');

  if (!response.ok) {
    throw new Error('Failed to fetch conversations');
  }

  return response.json();
}

export async function getConversation(id: string): Promise<ConversationWithMessages> {
  const response = await fetch(`/api/chat/conversations/${id}`);

  if (!response.ok) {
    throw new Error('Failed to fetch conversation');
  }

  return response.json();
}

export async function deleteConversation(id: string): Promise<void> {
  const response = await fetch(`/api/chat/conversations/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete conversation');
  }
}
