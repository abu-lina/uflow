// Chat-related TypeScript types for Plan 176 Chatbot Feature

export type ChatRole = 'user' | 'assistant' | 'tool' | 'system';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  results?: ProviderCardData[];
  options?: string[];
}

export interface ToolCallFunction {
  name: string;
  arguments: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: ToolCallFunction;
}

export interface ToolResult {
  tool_call_id: string;
  role: 'tool';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  max_tokens?: number;
  temperature?: number;
}

export interface OpenRouterResponse {
  id: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterError {
  error: {
    message: string;
    type: string;
    code?: number;
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export interface ChatRequest {
  message: string;
  conversation_id?: string;
}

export interface ChatResponse {
  conversation_id: string;
  message: {
    role: 'assistant';
    content: string;
    tool_calls?: ToolCall[];
  };
  results?: ProviderCardData[];
  options?: string[];
  guardrail?: 'redirect' | 'block';
}

export interface ProviderCardData {
  provider_id: string;
  provider_name: string;
  address_city: string | null;
  category_name: string | null;
  listing_type: string | null;
  muslim_owned: boolean;
  has_prayer_space: boolean;
  family_friendly: boolean;
  women_friendly: boolean;
  halal_level?: number;
  no_alcohol?: boolean;
  no_pork?: boolean;
}

export interface ConversationListItem {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface ConversationWithMessages {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export interface GuardrailResult {
  status: 'ok' | 'redirect' | 'block';
  redirectCount: number;
}

export interface RegistrationData {
  name: string;
  listing_type: 'food' | 'store' | 'ummah';
  category_id: string;
  city: string;
  street?: string;
  zip?: string;
  country?: string;
  phone?: string;
  email?: string;
  description?: string;
  website?: string;
  muslim_owned?: boolean;
  has_prayer_space?: boolean;
  family_friendly?: boolean;
  women_friendly?: boolean;
  halal_level?: number;
  no_alcohol?: boolean;
  no_pork?: boolean;
  no_gambling?: boolean;
  makes_donations?: boolean;
}

export const MAX_MESSAGE_LENGTH = 2000;
