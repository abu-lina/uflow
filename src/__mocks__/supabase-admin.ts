import { vi } from 'vitest';

/**
 * Mock Supabase Admin Client for API route testing
 * 
 * This mock provides a complete Supabase admin client with:
 * - Database operations (from, select, eq, maybeSingle, update)
 * - Auth admin operations (listUsers, updateUserById, generateLink)
 * 
 * Usage in tests:
 * ```typescript
 * import { createMockSupabaseAdmin } from '@/__mocks__/supabase-admin';
 * 
 * vi.mock('@supabase/supabase-js', () => ({
 *   createClient: vi.fn(() => createMockSupabaseAdmin()),
 * }));
 * ```
 */

export interface MockTokenData {
  id: string;
  user_id: string;
  email: string;
  token: string;
  type: 'signup' | 'password_reset' | 'magic_link';
  expires_at: string;
  used: boolean;
  created_at: string;
  updated_at: string;
}

export interface MockUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  user_metadata?: {
    email_confirmed?: boolean;
    email_confirmed_at?: string;
    [key: string]: unknown;
  };
}

export interface MockSupabaseAdmin {
  from: (table: string) => MockQueryBuilder;
  auth: {
    admin: {
      listUsers: () => Promise<{ data: { users: MockUser[] }; error: null }>;
      updateUserById: (userId: string, updates: unknown) => Promise<{ error: null }>;
      generateLink: (options: {
        type: 'magiclink';
        email: string;
        options?: { redirectTo: string };
      }) => Promise<{
        data: {
          properties: {
            hashed_token: string;
          };
        };
        error: null;
      }>;
    };
  };
}

export interface MockQueryBuilder {
  select: (columns?: string) => MockQueryBuilder;
  eq: (column: string, value: unknown) => MockQueryBuilder;
  maybeSingle: () => Promise<{ data: MockTokenData | null; error: null | { message: string } }>;
  update: (values: Partial<MockTokenData>) => MockQueryBuilder;
}

/**
 * Create a mock Supabase admin client with configurable responses
 */
export function createMockSupabaseAdmin(
  options: {
    tokenData?: MockTokenData | null;
    tokenError?: { message: string } | null;
    users?: MockUser[];
    userError?: { message: string } | null;
    updateError?: { message: string } | null;
    generateLinkError?: { message: string } | null;
    hashedToken?: string;
  } = {}
): MockSupabaseAdmin {
  const {
    tokenData = null,
    tokenError = null,
    users = [],
    userError = null,
    updateError = null,
    generateLinkError = null,
    hashedToken = 'mock-hashed-token-123',
  } = options;

  // Track query chain for testing
  let queryChain: Array<{ method: string; args: unknown[] }> = [];

  const queryBuilder: MockQueryBuilder = {
    select: vi.fn((columns?: string) => {
      queryChain.push({ method: 'select', args: [columns] });
      return queryBuilder;
    }),
    eq: vi.fn((column: string, value: unknown) => {
      queryChain.push({ method: 'eq', args: [column, value] });
      return queryBuilder;
    }),
    maybeSingle: vi.fn(async () => {
      if (tokenError) {
        return { data: null, error: tokenError };
      }
      return { data: tokenData, error: null };
    }),
    update: vi.fn((values: Partial<MockTokenData>) => {
      queryChain.push({ method: 'update', args: [values] });
      return {
        eq: vi.fn((column: string, value: unknown) => {
          queryChain.push({ method: 'eq', args: [column, value] });
          return Promise.resolve({ error: updateError || null });
        }),
      };
    }),
  };

  return {
    from: vi.fn((_table: string) => {
      queryChain = [];
      return queryBuilder;
    }),
    auth: {
      admin: {
        listUsers: vi.fn(async () => {
          if (userError) {
            return { data: { users: [] }, error: userError };
          }
          return { data: { users }, error: null };
        }),
        updateUserById: vi.fn(async (_userId: string, _updates: unknown) => {
          return { error: null };
        }),
        generateLink: vi.fn(async (_options: {
          type: 'magiclink';
          email: string;
          options?: { redirectTo: string };
        }) => {
          if (generateLinkError) {
            return { data: null, error: generateLinkError };
          }
          return {
            data: {
              properties: {
                hashed_token: hashedToken,
              },
            },
            error: null,
          };
        }),
      },
    },
  };
}

/**
 * Helper to create mock token data
 */
export function createMockTokenData(
  overrides: Partial<MockTokenData> = {}
): MockTokenData {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

  return {
    id: 'token-id-123',
    user_id: 'user-id-123',
    email: 'test@example.com',
    token: 'mock-token-123',
    type: 'magic_link',
    expires_at: expiresAt.toISOString(),
    used: false,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    ...overrides,
  };
}

/**
 * Helper to create mock user data
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 'user-id-123',
    email: 'test@example.com',
    email_confirmed_at: null,
    user_metadata: {},
    ...overrides,
  };
}
