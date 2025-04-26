/**
 * @fileoverview Types for user profiles
 * @module types/profiles
 */

export interface Profile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at?: string;
}

export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at'>>; 