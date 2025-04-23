// Auth-related types and interfaces
export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

export type AuthStatus = 'authenticated' | 'unauthenticated' | 'loading'; 