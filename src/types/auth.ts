import type { User } from '@supabase/supabase-js';

export interface AuthHook {
  user: User | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
}
