/**
 * @fileoverview Types for authentication
 * @module types/auth
 */

export interface AuthData {
  id: string;
  user_id: string;
  provider: string;
  last_sign_in_at: string;
  created_at: string;
  updated_at?: string;
} 